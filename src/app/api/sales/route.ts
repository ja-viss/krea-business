import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    const sales = await SaleModel.find({ store: storeId }).sort({ createdAt: -1 });

    return NextResponse.json(sales, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las ventas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las ventas.', error: errorMessage }, { status: 500 });
  }
}
