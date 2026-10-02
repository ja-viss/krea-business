
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import LayawayModel from '@/models/Layaway';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = params;
        const { action, userId, userName } = await req.json(); // action: CANCEL or EXPIRE

        const layaway = await LayawayModel.findById(id).session(session);
        if (!layaway) throw new Error("Apartado no encontrado");
        if (layaway.status !== 'ACTIVE') throw new Error("Solo se pueden cancelar apartados activos.");

        // 1. Liberar Stock Reservado
        for (const item of layaway.items) {
            const product = await ProductModel.findById(item.productId).session(session);
            if (product) {
                product.reservedStock = Math.max(0, product.reservedStock - item.quantity);
                await product.save({ session });
            }
        }

        // 2. Actualizar Estado
        layaway.status = action === 'EXPIRE' ? 'EXPIRED' : 'CANCELLED';
        await layaway.save({ session });

        await createLog({
            store: String(layaway.store),
            user: userId,
            userName: userName,
            action: `APARTADO_${action}`,
            module: 'Ventas',
            details: `Apartado ${layaway.code} marcado como ${layaway.status}. Stock liberado al inventario disponible.`
        });

        await session.commitTransaction();
        return NextResponse.json({ message: `Apartado ${layaway.status.toLowerCase()} con éxito.` });

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
