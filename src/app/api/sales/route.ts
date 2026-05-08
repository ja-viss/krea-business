
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'El ID de la tienda es inválido o falta.' }, { status: 400 });
    }
    
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    let query: any = { store: storeObjectId };

    // Filtros para Reportes o Vista General
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

    let queryBuilder;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        query['items.product'] = new mongoose.Types.ObjectId(productId);
        queryBuilder = SaleModel.find(query).sort({ createdAt: -1 }).populate('items.product');
    } else {
        queryBuilder = SaleModel.find(query).sort({ createdAt: -1 });
        // Solo intentamos popular si el campo existe y es válido para evitar CastErrors
        queryBuilder = queryBuilder.populate({
            path: 'customer',
            select: 'idNumber name',
            match: { _id: { $exists: true } }
        });
    }

    const sales = await queryBuilder.lean().exec();

    return NextResponse.json(sales, { status: 200 });

  } catch (error: any) {
    console.error('Error detallado al obtener ventas:', error);
    return NextResponse.json({ 
        message: 'Error en la base de datos al obtener ventas.', 
        error: error.message 
    }, { status: 500 });
  }
}
