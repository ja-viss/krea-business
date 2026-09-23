
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect(); // Master DB

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'ID tienda obligatorio.' }, { status: 400 });
    }
    
    const store = await StoreModel.findById(storeId);
    if (!store) return NextResponse.json({ message: 'Empresa no encontrada.' }, { status: 404 });

    if (store.status === 'Suspended') {
      return NextResponse.json({ message: 'Empresa suspendida por falta de pago.' }, { status: 403 });
    }

    // --- CONECTAR AL NODO AISLADO ---
    const { models } = await getTenantDb(String(store._id), store.tenantDbUri || '');

    const fromDate = req.nextUrl.searchParams.get('from');
    const toDate = req.nextUrl.searchParams.get('to');

    let query: any = {};
    if (fromDate && fromDate !== 'undefined') {
        const start = new Date(fromDate);
        const end = toDate && toDate !== 'undefined' ? new Date(toDate) : new Date(fromDate);
        if (!isNaN(start.getTime())) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }
    }

    const sales = await models.Sale.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: 'customer', model: models.Customer, select: 'name idNumber' })
      .lean()
      .exec();

    return NextResponse.json(sales || [], { status: 200 });

  } catch (error: any) {
    console.error('Error GET /api/sales:', error);
    return NextResponse.json({ message: 'Error recuperando ventas del nodo aislado.' }, { status: 500 });
  }
}
