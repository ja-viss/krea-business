
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'El ID de la tienda es inválido o no se proporcionó.' }, { status: 400 });
    }
    
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    let query: any = { store: storeObjectId };

    // Filtros opcionales
    const productId = req.nextUrl.searchParams.get('productId');
    const fromDate = req.nextUrl.searchParams.get('from');
    const toDate = req.nextUrl.searchParams.get('to');

    if (fromDate && fromDate !== 'undefined') {
        const start = new Date(fromDate);
        const end = toDate && toDate !== 'undefined' ? new Date(toDate) : new Date(fromDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        query['items.product'] = new mongoose.Types.ObjectId(productId);
    }

    // Usamos lean() para rendimiento y populate selectivo para evitar errores de casteo
    const sales = await SaleModel.find(query)
      .sort({ createdAt: -1 })
      .populate({
          path: 'customer',
          select: 'name idNumber',
          // match asegura que solo intentemos popular si el ID es un ObjectId válido en la colección de clientes
          options: { retainNullValues: true }
      })
      .lean()
      .exec();

    return NextResponse.json(sales || [], { status: 200 });

  } catch (error: any) {
    console.error('Error crítico en GET /api/sales:', error);
    return NextResponse.json({ 
        message: 'Error en la base de datos al recuperar las ventas.', 
        details: error.message 
    }, { status: 500 });
  }
}
