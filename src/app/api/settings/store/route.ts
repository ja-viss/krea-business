import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }

    const store = await StoreModel.findById(storeId);
    if (!store) {
      return NextResponse.json({ message: 'Tienda no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(store, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al obtener configuración.', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { storeId, ...updateData } = body;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }

    const updatedStore = await StoreModel.findByIdAndUpdate(storeId, updateData, { new: true });
    if (!updatedStore) {
      return NextResponse.json({ message: 'Tienda no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(updatedStore, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al actualizar configuración.', error: error.message }, { status: 500 });
  }
}
