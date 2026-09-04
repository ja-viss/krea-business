
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReturnModel from '@/models/Return';
import SaleModel from '@/models/Sale';
import ProductModel from '@/models/Product';
import CreditNoteModel from '@/models/CreditNote';
import CashSessionModel from '@/models/CashSession';
import mongoose from 'mongoose';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await req.json();
        const { 
            storeId, 
            userId, 
            saleId, 
            itemsToReturn, 
            compensationMethod, 
            reason 
        } = body;

        // 1. Validar Venta Original
        const sale = await SaleModel.findById(saleId).session(session);
        if (!sale) throw new Error("Factura original no encontrada.");

        // 2. Procesar Items y devolver stock
        let totalToRefund = 0;
        for (const item of itemsToReturn) {
            const originalItem = sale.items.find((i: any) => String(i.product) === String(item.product));
            if (!originalItem || item.quantity > originalItem.quantity) {
                throw new Error(`Cantidad inválida para el producto: ${item.name}`);
            }

            // Devolver stock
            await ProductModel.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
                $set: { status: 'En Stock' }
            }, { session });

            totalToRefund += item.price * item.quantity * (1 + item.taxRate);
        }

        // 3. Crear Registro de Devolución
        const newReturn = new ReturnModel({
            store: storeId,
            sale: saleId,
            invoiceNumber: sale.invoiceNumber,
            customerName: sale.customerName,
            items: itemsToReturn,
            totalRefund: totalToRefund,
            compensationMethod,
            reason,
            authorizedBy: userId
        });
        await newReturn.save({ session });

        // 4. Manejar Compensación
        if (compensationMethod === 'Nota de Credito') {
            const creditNote = new CreditNoteModel({
                store: storeId,
                customer: sale.customer || null,
                customerName: sale.customerName,
                amount: totalToRefund,
                remainingAmount: totalToRefund,
                code: `NC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
                expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 días
            });
            await creditNote.save({ session });
        } else if (compensationMethod === 'Reembolso') {
            // Registrar salida de caja si hay sesión abierta
            const activeSession = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' }).session(session);
            if (activeSession) {
                activeSession.adjustments.push({
                    type: 'OUT',
                    currency: 'VES',
                    amount: totalToRefund,
                    reason: `Reembolso Devolución Factura #${sale.invoiceNumber}`,
                    timestamp: new Date()
                });
                await activeSession.save({ session });
            }
        }

        await session.commitTransaction();
        return NextResponse.json({ message: "Devolución procesada con éxito", returnId: newReturn._id });

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
