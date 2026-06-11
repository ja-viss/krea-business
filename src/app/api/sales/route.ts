
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
// Importamos CustomerModel para registrar el esquema en Mongoose y evitar el error "Schema hasn't been registered"
import CustomerModel from '@/models/Customer'; 
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
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        query['items.product'] = new mongoose.Types.ObjectId(productId);
    }

    // Usamos lean() para rendimiento y populate para traer datos del cliente
    // Mongoose ahora encontrará el modelo "Customer" porque lo importamos arriba
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
