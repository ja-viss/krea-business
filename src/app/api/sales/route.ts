
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }
    
    let query: any = { store: storeId };

    // Filtering for Kardex Report
    const productId = req.nextUrl.searchParams.get('productId');
    const fromDate = req.nextUrl.searchParams.get('from');
    const toDate = req.nextUrl.searchParams.get('to');

    if (productId && fromDate) {
        query['items.product'] = new mongoose.Types.ObjectId(productId);
        
        const start = new Date(fromDate);
        // Adjust to include the whole day
        const end = toDate ? new Date(toDate) : new Date(fromDate);
        end.setHours(23, 59, 59, 999);

        query.createdAt = { $gte: start, $lte: end };
    }

    const sales = await SaleModel.find(query).sort({ createdAt: -1 }).populate('items.product');

    return NextResponse.json(sales, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las ventas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las ventas.', error: errorMessage }, { status: 500 });
  }
}
