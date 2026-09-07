
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

/**
 * API para ajuste de stock por pérdida/merma.
 * Registra el motivo y actualiza la auditoría.
 */

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        await dbConnect();
        const { productId } = params;
        const { quantity, reason, userId, userName, storeId } = await req.json();

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });
        }

        if (!quantity || quantity <= 0) {
            return NextResponse.json({ message: 'Cantidad inválida' }, { status: 400 });
        }

        if (!reason || reason.trim().length < 5) {
            return NextResponse.json({ message: 'Debe proporcionar una justificación válida (mín. 5 caracteres)' }, { status: 400 });
        }

        const product = await ProductModel.findById(productId);
        if (!product) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });

        if (product.stock < quantity) {
            return NextResponse.json({ message: 'No puede registrar una pérdida mayor al stock disponible' }, { status: 400 });
        }

        const oldStock = product.stock;
        const newStock = product.stock - quantity;

        // Actualizar stock y estado
        product.stock = newStock;
        if (product.stock <= 0) product.status = 'Sin Stock';
        else if (product.stock <= product.minStock) product.status = 'Stock Bajo';
        
        await product.save();

        // Registrar en Auditoría
        await createLog({
            store: storeId,
            user: userId,
            userName: userName,
            action: 'MERMA_REGISTRADA',
            module: 'Inventario',
            details: `Pérdida de ${quantity} ${product.isWeightable ? 'Kg' : 'Unid'} en '${product.name}'. Motivo: ${reason}`,
            targetId: String(product._id),
            previousState: { stock: oldStock },
            newState: { stock: newStock, reason }
        });

        return NextResponse.json({ message: 'Pérdida registrada con éxito', newStock });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
