
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

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
    const { storeId, userId, userName, ...updateData } = body;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }

    // Actualización con $set para asegurar que los objetos anidados (pagoMovil) se guarden correctamente
    const updatedStore = await StoreModel.findByIdAndUpdate(
        storeId, 
        { $set: updateData }, 
        { new: true, runValidators: true }
    );

    if (!updatedStore) {
      return NextResponse.json({ message: 'Tienda no encontrada en la base de datos.' }, { status: 404 });
    }

    // AUDITORÍA: Registrar cambio en configuración
    await createLog({
        store: storeId,
        user: userId || 'SISTEMA',
        userName: userName || 'Admin',
        action: 'CONFIG_SISTEMA_ACTUALIZADA',
        module: 'Configuración',
        details: `Actualización de parámetros generales y datos de recaudación Pago Móvil.`,
        targetId: storeId,
        newState: updateData
    });

    return NextResponse.json(updatedStore, { status: 200 });
  } catch (error: any) {
    console.error('Error Crítico Settings PUT:', error);
    return NextResponse.json({ message: 'Error al actualizar configuración.', error: error.message }, { status: 500 });
  }
}
