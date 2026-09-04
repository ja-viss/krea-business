
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel, { IProduct } from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';


// GET a single product by ID
export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await dbConnect();
    const { productId } = params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json({ message: 'ID de producto inválido.' }, { status: 400 });
    }

    const product = await ProductModel.findById(productId);

    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error) {
    console.error('Error al obtener el producto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener el producto.', error: errorMessage }, { status: 500 });
  }
}

// PUT to update a product by ID (CON AUDITORÍA DE PRECIOS Y STOCK)
export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await dbConnect();
    const { productId } = params;
    const body = await req.json();
    const userId = body.userId || 'SISTEMA';
    const userName = body.userName || 'Admin';

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json({ message: 'ID de producto inválido.' }, { status: 400 });
    }
    
    const oldProduct = await ProductModel.findById(productId);
    if (!oldProduct) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });

    const updateData: Partial<IProduct> = { ...body };

    // Recalcular estado si cambia stock
    if (updateData.stock !== undefined || updateData.minStock !== undefined) {
        const stock = updateData.stock ?? oldProduct.stock;
        const minStock = updateData.minStock ?? oldProduct.minStock;
        let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = 'Sin Stock';
        if (stock > minStock) status = 'En Stock';
        else if (stock > 0) status = 'Stock Bajo';
        updateData.status = status;
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(productId, updateData, { new: true });

    // AUDITORÍA: Detectar cambios críticos
    let changesDetected = [];
    if (oldProduct.price !== updatedProduct.price) changesDetected.push(`Precio: ${oldProduct.price} -> ${updatedProduct.price}`);
    if (oldProduct.stock !== updatedProduct.stock) changesDetected.push(`Stock: ${oldProduct.stock} -> ${updatedProduct.stock}`);
    
    if (changesDetected.length > 0) {
        await createLog({
            store: String(oldProduct.store),
            user: userId,
            userName: userName,
            action: 'PRODUCTO_MODIFICADO',
            module: 'Inventario',
            details: `Cambio en '${oldProduct.name}': ${changesDetected.join(', ')}`,
            targetId: String(oldProduct._id),
            previousState: { price: oldProduct.price, stock: oldProduct.stock },
            newState: { price: updatedProduct.price, stock: updatedProduct.stock }
        });
    }

    return NextResponse.json(updatedProduct);

  } catch (error: any) {
    console.error('Error al actualizar el producto:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE a product by ID
export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        await dbConnect();
        const { productId } = params;

        const deletedProduct = await ProductModel.findByIdAndDelete(productId);

        if (deletedProduct) {
            await createLog({
                store: String(deletedProduct.store),
                user: 'SISTEMA',
                userName: 'Admin',
                action: 'PRODUCTO_ELIMINADO',
                module: 'Inventario',
                details: `Producto eliminado: ${deletedProduct.name}`,
                targetId: String(deletedProduct._id),
                previousState: deletedProduct.toObject()
            });
        }

        return NextResponse.json({ message: 'Producto eliminado exitosamente.' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
