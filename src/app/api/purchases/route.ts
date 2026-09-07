
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PurchaseOrderModel, { POCounterModel } from '@/models/PurchaseOrder';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        if (!storeId) return NextResponse.json({ message: 'ID tienda obligatorio' }, { status: 400 });

        const orders = await PurchaseOrderModel.find({ store: storeId }).sort({ createdAt: -1 });
        return NextResponse.json(orders);
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
            vendor, 
            lotReference, 
            expectedDeliveryDate, 
            items, 
            notes,
            providerCoords,
            destinationCoords
        } = body;

        if (!storeId || !vendor || !items || items.length === 0 || !providerCoords || !destinationCoords) {
            throw new Error("Datos del pedido o geolocalización incompletos");
        }

        // 1. Generar número correlativo (REQ-XXXX)
        const counter = await POCounterModel.findOneAndUpdate(
            { storeId },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session }
        );

        const totalAmount = items.reduce((acc: number, i: any) => acc + (i.cost * i.quantity), 0);

        const newOrder = new PurchaseOrderModel({
            store: storeId,
            orderNumber: counter.seq,
            lotReference: lotReference || undefined,
            vendor,
            expectedDeliveryDate: new Date(expectedDeliveryDate),
            status: 'En camino',
            logisticsStatus: 'In Transit',
            providerCoords,
            destinationCoords,
            items,
            totalAmount,
            notes
        });

        await newOrder.save({ session });

        // 2. Afectar Stock en Tránsito
        for (const item of items) {
            await ProductModel.findByIdAndUpdate(item.product, {
                $inc: { inTransit: item.quantity }
            }, { session });
        }

        await session.commitTransaction();
        return NextResponse.json(newOrder, { status: 201 });

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
