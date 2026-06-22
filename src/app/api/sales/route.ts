
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import StoreModel from '@/models/Store';
import CustomerModel from '@/models/Customer'; 
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'ID tienda obligatorio.' }, { status: 400 });
    }
    
    // Validación de Módulo
    if (storeId !== 'SYSTEM_MASTER') {
        const store = await StoreModel.findById(storeId);
        if (store && store.enabledModules && store.enabledModules.sales === false) {
            return NextResponse.json({ message: 'Módulo de Ventas deshabilitado.' }, { status: 403 });
        }
    }

    let query: any = {};
    if (storeId !== 'SYSTEM_MASTER') {
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return NextResponse.json({ message: 'ID tienda inválido.' }, { status: 400 });
        }
        query.store = new mongoose.Types.ObjectId(storeId);
    }

    const fromDate = req.nextUrl.searchParams.get('from');
    const toDate = req.nextUrl.searchParams.get('to');

    if (fromDate && fromDate !== 'undefined') {
        const start = new Date(fromDate);
        const end = toDate && toDate !== 'undefined' ? new Date(toDate) : new Date(fromDate);
        if (!isNaN(start.getTime())) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }
    }

    const sales = await SaleModel.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: 'customer', model: CustomerModel, select: 'name idNumber' })
      .lean()
      .exec();

    return NextResponse.json(sales || [], { status: 200 });

  } catch (error: any) {
    console.error('Error GET /api/sales:', error);
    return NextResponse.json({ message: 'Error recuperando ventas.' }, { status: 500 });
  }
}
