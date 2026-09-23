
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await dbConnect();
    const { productId } = params;
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ message: 'ID tienda inválido.' }, { status: 400 });
    }

    const store = await StoreModel.findById(storeId);
    if (!store) throw new Error("Tienda no encontrada");

    const { models } = await getTenantDb(storeId, store.tenantDbUri || '');
    const product = await models.Product.findById(productId).lean();

    if (!product) return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await dbConnect();
    const { productId } = params;
    const body = await req.json();
    const { storeId, userId, userName, ...updateData } = body;

    if (!storeId) throw new Error("ID tienda requerido");
    const store = await StoreModel.findById(storeId);
    if (!store) throw new Error("Tienda no encontrada");

    const { models } = await getTenantDb(storeId, store.tenantDbUri || '');
    
    // AUDITORÍA: Capturar estado previo
    const previousState = await models.Product.findById(productId).lean();
    if (!previousState) throw new Error("Producto no encontrado");

    // Recalcular estado si hay cambios en stock
    if (updateData.stock !== undefined) {
        const min = updateData.minStock ?? previousState.minStock;
        if (updateData.stock <= 0) updateData.status = 'Sin Stock';
        else if (updateData.stock <= min) updateData.status = 'Stock Bajo';
        else updateData.status = 'En Stock';
    }

    const updatedProduct = await models.Product.findByIdAndUpdate(productId, updateData, { new: true }).lean();

    // Registro Forense Asíncrono
    createLog({
        store: storeId,
        user: userId || 'SYSTEM',
        userName: userName || 'Admin',
        action: 'PRODUCTO_MODIFICADO',
        module: 'Inventario',
        details: `Actualización de ficha: ${updatedProduct.name}`,
        targetId: productId,
        previousState,
        newState: updatedProduct
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        await dbConnect();
        const { productId } = params;
        const storeId = req.nextUrl.searchParams.get('storeId');

        if (!storeId) throw new Error("ID tienda requerido");
        const store = await StoreModel.findById(storeId);
        if (!store) throw new Error("Tienda no encontrada");

        const { models } = await getTenantDb(storeId, store.tenantDbUri || '');
        const previousState = await models.Product.findByIdAndDelete(productId).lean();

        if (previousState) {
            createLog({
                store: storeId,
                user: 'SYSTEM',
                userName: 'Admin',
                action: 'PRODUCTO_ELIMINADO',
                module: 'Inventario',
                details: `Eliminación definitiva de: ${previousState.name}`,
                targetId: productId,
                previousState
            });
        }

        return NextResponse.json({ message: 'Producto purgado exitosamente.' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
