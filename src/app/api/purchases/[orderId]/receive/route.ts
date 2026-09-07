
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PurchaseOrderModel from '@/models/PurchaseOrder';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function PUT(req: NextRequest, { params }: { params: { orderId: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { orderId } = params;
        const { userId, userName } = await req.json();

        const order = await PurchaseOrderModel.findById(orderId).session(session);
        if (!order) throw new Error("Orden no encontrada");
        if (order.status === 'Recibido') throw new Error("Esta orden ya fue procesada");

        // 1. Transferencia de Tránsito a Disponible
        for (const item of order.items) {
            const product = await ProductModel.findById(item.product).session(session);
            if (!product) continue;

            const newStock = product.stock + item.quantity;
            const newTransit = Math.max(0, product.inTransit - item.quantity);

            // Actualizar costos y existencias
            product.stock = newStock;
            product.inTransit = newTransit;
            product.cost = item.cost; // Actualizar costo promedio/último costo
            
            // Recalcular estado
            if (newStock > product.minStock) product.status = 'En Stock';
            else if (newStock > 0) product.status = 'Stock Bajo';
            else product.status = 'Sin Stock';

            await product.save({ session });
        }

        // 2. Cerrar Orden
        order.status = 'Recibido';
        order.receivedAt = new Date();
        await order.save({ session });

        // 3. Auditoría
        await createLog({
            store: String(order.store),
            user: userId,
            userName: userName,
            action: 'PEDIDO_RECIBIDO',
            module: 'Inventario',
            details: `Recepción de pedido REQ-${String(order.orderNumber).padStart(4, '0')} del proveedor ${order.vendor}.`
        });

        await session.commitTransaction();
        return NextResponse.json({ message: "Mercancía ingresada al inventario." });

    } catch (e: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
