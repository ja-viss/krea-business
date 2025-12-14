
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel, { IProduct } from '@/models/Product';
import mongoose from 'mongoose';


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

// PUT to update a product by ID
export async function PUT(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    await dbConnect();
    const { productId } = params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json({ message: 'ID de producto inválido.' }, { status: 400 });
    }
    
    const updateData: Partial<IProduct> = { ...body };

    // Recalculate status if stock or minStock are being updated
    if (updateData.stock !== undefined || updateData.minStock !== undefined) {
        const product = await ProductModel.findById(productId);
        if (product) {
            const stock = updateData.stock ?? product.stock;
            const minStock = updateData.minStock ?? product.minStock;
            let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = 'Sin Stock';
            if (stock > minStock) {
                status = 'En Stock';
            } else if (stock > 0 && stock <= minStock) {
                status = 'Stock Bajo';
            }
            updateData.status = status;
        }
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(productId, updateData, { new: true });

    if (!updatedProduct) {
      return NextResponse.json({ message: 'Producto no encontrado para actualizar.' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error: any) {
    console.error('Error al actualizar el producto:', error);
    if (error.code === 11000) {
      const key = Object.keys(error.keyValue)[0];
      return NextResponse.json({ message: `Ya existe un producto con este ${key}.` }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al actualizar el producto.', error: errorMessage }, { status: 500 });
  }
}

// DELETE a product by ID
export async function DELETE(req: NextRequest, { params }: { params: { productId: string } }) {
    try {
        await dbConnect();
        const { productId } = params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return NextResponse.json({ message: 'ID de producto inválido.' }, { status: 400 });
        }

        const deletedProduct = await ProductModel.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return NextResponse.json({ message: 'Producto no encontrado para eliminar.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Producto eliminado exitosamente.' }, { status: 200 });

    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
        return NextResponse.json({ message: 'Error al eliminar el producto.', error: errorMessage }, { status: 500 });
    }
}
    
