
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

    const oldConfig = await StoreModel.findById(storeId);
    if (!oldConfig) return NextResponse.json({ message: 'No encontrada' }, { status: 404 });

    const updatedStore = await StoreModel.findByIdAndUpdate(storeId, updateData, { new: true });

    // AUDITORÍA: Registrar cambio en configuración fiscal
    await createLog({
        store: storeId,
        user: userId || 'SISTEMA',
        userName: userName || 'Admin',
        action: 'CONFIG_FISCAL_ACTUALIZADA',
        module: 'Configuración',
        details: `Actualización de datos maestros de la empresa (RIF/Dirección/Nombre).`,
        targetId: storeId,
        previousState: { name: oldConfig.name, rif: oldConfig.rif, address: oldConfig.address },
        newState: { name: updatedStore.name, rif: updatedStore.rif, address: updatedStore.address }
    });

    return NextResponse.json(updatedStore, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error al actualizar configuración.', error: error.message }, { status: 500 });
  }
}
