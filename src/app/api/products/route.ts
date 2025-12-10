import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    const products = await ProductModel.find({ store: storeId }).sort({ createdAt: -1 });

    return NextResponse.json(products, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los productos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los productos.', error: errorMessage }, { status: 500 });
  }
}
