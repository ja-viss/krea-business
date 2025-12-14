import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';

// Search for a single product by barcode or SKU
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');
    const code = req.nextUrl.searchParams.get('code');

    if (!storeId) {
        return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }
    if (!code) {
        return NextResponse.json({ message: 'El código de producto es obligatorio.' }, { status: 400 });
    }

    const product = await ProductModel.findOne({
      store: storeId,
      $or: [{ barcode: code }, { sku: code }],
    });

    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error) {
    console.error('Error al buscar el producto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al buscar el producto.', error: errorMessage }, { status: 500 });
  }
}
