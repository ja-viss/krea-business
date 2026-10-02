
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LayawayModel from '@/models/Layaway';
import SaleModel, { SaleCounterV2Model } from '@/models/Sale';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = params;
        const { amountOriginal, currencyOriginal, exchangeRate, amountUsd, method, userId, userName } = await req.json();

        const layaway = await LayawayModel.findById(id).session(session);
        if (!layaway) throw new Error("Apartado no encontrado");
        if (layaway.status !== 'ACTIVE') throw new Error("Este apartado no está activo.");

        // 1. Registrar Pago
        layaway.payments.push({
            paymentId: `PAY-${Date.now()}`,
            date: new Date(),
            method,
            amountOriginal,
            currencyOriginal,
            exchangeRate,
            amountUsd,
            cashierId: userId
        });

        layaway.financials.paidAmountUsd += amountUsd;
        layaway.financials.remainingBalanceUsd = Math.max(0, layaway.financials.totalAmountUsd - layaway.financials.paidAmountUsd);

        // 2. ¿Liquidación Completa?
        if (layaway.financials.remainingBalanceUsd <= 0.01) {
            layaway.status = 'COMPLETED';
            layaway.dates.deliveredAt = new Date();

            // Descontar Stock Físico y Liberar Reserva
            for (const item of layaway.items) {
                const product = await ProductModel.findById(item.productId).session(session);
                if (product) {
                    product.stock -= item.quantity;
                    product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
                    
                    if (product.stock <= 0) product.status = 'Sin Stock';
                    else if (product.stock <= product.minStock) product.status = 'Stock Bajo';
                    
                    await product.save({ session });
                }
            }

            // Generar Factura Final (Venta)
            const saleCounter = await SaleCounterV2Model.findOneAndUpdate(
                { storeId: String(layaway.store) },
                { $inc: { seq: 1 } },
                { new: true, upsert: true, session }
            );

            const newSale = new SaleModel({
                store: layaway.store,
                invoiceNumber: saleCounter.seq,
                customerName: layaway.customer.name,
                customer: layaway.customer.customerId,
                totalAmount: layaway.financials.totalAmountUsd, // Simplificado a USD para demo
                items: layaway.items.map(i => ({
                    product: i.productId,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.unitPriceUsd,
                    taxRate: i.taxRate
                })),
                paymentMethod: 'Varios (Apartado)',
                status: 'Pagado'
            });
            await newSale.save({ session });
        }

        await layaway.save({ session });

        await createLog({
            store: String(layaway.store),
            user: userId,
            userName: userName,
            action: 'ABONO_APARTADO',
            module: 'Ventas',
            details: `Abono de $${amountUsd} recibido para apartado ${layaway.code}. Saldo: $${layaway.financials.remainingBalanceUsd}.`
        });

        await session.commitTransaction();
        return NextResponse.json(layaway);

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
