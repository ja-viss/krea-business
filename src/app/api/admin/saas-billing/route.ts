
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaaSPaymentModel from '@/models/SaaSPayment';
import StoreModel from '@/models/Store';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const payments = await SaaSPaymentModel.find()
            .populate({ path: 'store', model: StoreModel, select: 'name plan' })
            .sort({ createdAt: -1 });
        return NextResponse.json(payments);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const { paymentId, status, notes } = await req.json();

        if (!mongoose.Types.ObjectId.isValid(paymentId)) {
            return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });
        }

        const payment = await SaaSPaymentModel.findById(paymentId);
        if (!payment) return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });

        payment.status = status;
        payment.notes = notes;
        payment.processedAt = new Date();
        await payment.save();

        // Si se aprueba, extender licencia de la tienda (Lógica simple: +30 días)
        if (status === 'Aprobado') {
            const store = await StoreModel.findById(payment.store);
            if (store) {
                const currentExpiry = store.expiryDate && store.expiryDate > new Date() ? store.expiryDate : new Date();
                store.expiryDate = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
                store.status = 'Active';
                await store.save();
            }
        }

        return NextResponse.json({ message: 'Estado de pago actualizado y licencia procesada.' });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
