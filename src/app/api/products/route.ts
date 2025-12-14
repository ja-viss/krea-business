import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    const searchQuery = req.nextUrl.searchParams.get('search');
    
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }
    
    let query: any = { store: storeId };

    if (searchQuery) {
        query.$or = [
            { name: { $regex: searchQuery, $options: 'i' } },
            { sku: { $regex: searchQuery, $options: 'i' } },
            { barcode: { $regex: searchQuery, $options: 'i' } },
        ];
    }

    const products = await ProductModel.find(query).sort({ createdAt: -1 }).limit(searchQuery ? 10 : 50);

    return NextResponse.json(products, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los productos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los productos.', error: errorMessage }, { status: 500 });
  }
}
