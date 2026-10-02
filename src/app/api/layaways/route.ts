
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LayawayModel, { LayawayCounterModel } from '@/models/Layaway';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        const status = req.nextUrl.searchParams.get('status');

        const query: any = { store: storeId };
        if (status) query.status = status;

        const layaways = await LayawayModel.find(query).sort({ 'dates.createdAt': -1 });
        return NextResponse.json(layaways);
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
        const { 
            storeId, 
            customer, 
            items, 
            initialPayment, 
            expirationDays = 15,
            notes,
            userId,
            userName,
            type = 'LAYAWAY'
        } = body;

        // 1. Contador Correlativo
        const counter = await LayawayCounterModel.findOneAndUpdate(
            { storeId },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session }
        );

        const code = `APT-${new Date().getFullYear()}-${String(counter.seq).padStart(4, '0')}`;

        // 2. Procesar Items y Reservar Stock
        const processedItems = [];
        let totalUsd = 0;

        for (const item of items) {
            const product = await ProductModel.findById(item.productId).session(session);
            if (!product) throw new Error(`Producto ${item.name} no encontrado.`);
            
            const available = product.stock - product.reservedStock;
            if (available < item.quantity) {
                throw new Error(`Stock insuficiente para ${item.name}. Disponibles: ${available}`);
            }

            // Afectar Reserva
            product.reservedStock += item.quantity;
            await product.save({ session });

            const itemTotalUsd = item.priceUsd * item.quantity;
            totalUsd += itemTotalUsd;

            processedItems.push({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                unitPriceUsd: item.priceUsd,
                totalUsd: itemTotalUsd,
                taxRate: item.taxRate || 0.16
            });
        }

        const paidUsd = initialPayment.amountUsd;
        const balanceUsd = totalUsd - paidUsd;

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);

        const newLayaway = new LayawayModel({
            store: storeId,
            code,
            type,
            customer,
            items: processedItems,
            financials: {
                totalAmountUsd: totalUsd,
                paidAmountUsd: paidUsd,
                remainingBalanceUsd: balanceUsd
            },
            dates: {
                expirationDate
            },
            status: 'ACTIVE',
            payments: [{
                paymentId: `PAY-${Date.now()}`,
                date: new Date(),
                method: initialPayment.method,
                amountOriginal: initialPayment.amountOriginal,
                currencyOriginal: initialPayment.currencyOriginal,
                exchangeRate: initialPayment.exchangeRate,
                amountUsd: initialPayment.amountUsd,
                cashierId: userId
            }],
            notes
        });

        await newLayaway.save({ session });

        await createLog({
            store: storeId,
            user: userId,
            userName: userName,
            action: 'APARTADO_CREADO',
            module: 'Ventas',
            details: `Nuevo apartado ${code} para ${customer.name}. Monto: $${totalUsd}. Abono: $${paidUsd}.`
        });

        await session.commitTransaction();
        return NextResponse.json(newLayaway, { status: 201 });

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
