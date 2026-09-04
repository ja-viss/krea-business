
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import QuotationModel from '@/models/Quotation';
import SaleModel, { SaleCounterV2Model } from '@/models/Sale';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';

export async function POST(req: NextRequest, { params }: { params: { quoteId: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { quoteId } = params;
        const { paymentMethod = 'Efectivo', paymentReference = '' } = await req.json();

        const quote = await QuotationModel.findById(quoteId).session(session);
        if (!quote) throw new Error("Cotización no encontrada");
        if (quote.status === 'Convertida') throw new Error("Esta cotización ya fue facturada");

        // 1. Validar Stock
        for (const item of quote.items) {
            const product = await ProductModel.findById(item.product).session(session);
            if (!product || product.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.name}. Disponible: ${product?.stock || 0}`);
            }
        }

        // 2. Descontar Stock
        for (const item of quote.items) {
            await ProductModel.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            }, { session });
        }

        // 3. Crear Factura
        const saleCounter = await SaleCounterV2Model.findOneAndUpdate(
            { storeId: String(quote.store) },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session }
        );

        const newSale = new SaleModel({
            store: quote.store,
            invoiceNumber: saleCounter.seq,
            customer: quote.customer,
            customerName: quote.customerName,
            items: quote.items,
            subtotals: quote.subtotals,
            taxDetails: quote.taxDetails,
            totalAmount: quote.totalAmount,
            paymentMethod,
            paymentReference,
            status: (paymentMethod === 'Efectivo' || paymentMethod === 'Tarjeta') ? 'Pagado' : 'Pendiente'
        });

        await newSale.save({ session });

        // 4. Marcar Cotización como Convertida
        quote.status = 'Convertida';
        await quote.save({ session });

        await session.commitTransaction();
        return NextResponse.json({ message: "Conversión exitosa", saleId: newSale._id });

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
