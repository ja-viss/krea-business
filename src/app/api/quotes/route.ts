
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import QuotationModel, { QuoteCounterModel } from '@/models/Quotation';
import CustomerModel from '@/models/Customer';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        if (!storeId) return NextResponse.json({ message: 'ID tienda obligatorio' }, { status: 400 });

        const quotes = await QuotationModel.find({ store: storeId })
            .sort({ createdAt: -1 })
            .populate({ path: 'customer', model: CustomerModel, select: 'name idNumber' });

        return NextResponse.json(quotes);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await req.json();
        const { storeId, customerId, customerName, items, notes, expiryDays = 7 } = body;

        if (!storeId) throw new Error("ID de tienda requerido");

        // 1. Contador correlativo
        const counter = await QuoteCounterModel.findOneAndUpdate(
            { storeId },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session }
        );

        // 2. Cálculos
        const subtotals = { exempt: 0, general: 0, reduced: 0 };
        items.forEach((i: any) => {
            const sub = i.price * i.quantity;
            if (i.taxRate === 0) subtotals.exempt += sub;
            else if (i.taxRate === 0.08) subtotals.reduced += sub;
            else subtotals.general += sub;
        });

        const taxDetails = {
            general: subtotals.general * 0.16,
            reduced: subtotals.reduced * 0.08
        };

        const totalAmount = subtotals.exempt + subtotals.general + subtotals.reduced + taxDetails.general + taxDetails.reduced;

        const newQuote = new QuotationModel({
            store: storeId,
            quotationNumber: counter.seq,
            customer: customerId || null,
            customerName,
            items,
            subtotals,
            taxDetails,
            totalAmount,
            notes,
            expiryDate: new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000)),
            status: 'Pendiente'
        });

        await newQuote.save({ session });
        await session.commitTransaction();

        return NextResponse.json(newQuote, { status: 201 });
    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
