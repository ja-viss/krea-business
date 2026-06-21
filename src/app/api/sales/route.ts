import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import CustomerModel from '@/models/Customer'; 
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda no se proporcionó.' }, { status: 400 });
    }
    
    let query: any = {};
    
    // Si no es el administrador maestro, filtramos por tienda específica
    if (storeId !== 'SYSTEM_MASTER') {
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return NextResponse.json({ message: 'El ID de la tienda es inválido o no se proporcionó.' }, { status: 400 });
        }
        query.store = new mongoose.Types.ObjectId(storeId);
    }

    // Filtros opcionales
    const productId = req.nextUrl.searchParams.get('productId');
    const fromDate = req.nextUrl.searchParams.get('from');
    const toDate = req.nextUrl.searchParams.get('to');

    if (fromDate && fromDate !== 'undefined') {
        const start = new Date(fromDate);
        const end = toDate && toDate !== 'undefined' ? new Date(toDate) : new Date(fromDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        query['items.product'] = new mongoose.Types.ObjectId(productId);
    }

    const sales = await SaleModel.find(query)
      .sort({ createdAt: -1 })
      .populate({
          path: 'customer',
          model: CustomerModel,
          select: 'name idNumber',
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
