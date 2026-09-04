
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

    // Aplanamiento manual para asegurar que MongoDB procese correctamente la actualización
    // Esto garantiza que el objeto pagoMovil se guarde campo por campo
    const flatUpdate: any = {};
    
    // Campos de texto simples
    if (updateData.name) flatUpdate.name = updateData.name;
    if (updateData.rif) flatUpdate.rif = updateData.rif;
    if (updateData.address) flatUpdate.address = updateData.address;
    if (updateData.phone) flatUpdate.phone = updateData.phone;
    if (updateData.email) flatUpdate.email = updateData.email;
    if (updateData.seniatCondition) flatUpdate.seniatCondition = updateData.seniatCondition;
    if (updateData.footerMessage) flatUpdate.footerMessage = updateData.footerMessage;

    // Campos anidados de Pago Móvil (Dot Notation)
    if (updateData.pagoMovil) {
        flatUpdate['pagoMovil.bankCode'] = updateData.pagoMovil.bankCode || '0102';
        flatUpdate['pagoMovil.phone'] = updateData.pagoMovil.phone || '';
        flatUpdate['pagoMovil.idNumber'] = updateData.pagoMovil.idNumber || '';
    }

    const updatedStore = await StoreModel.findByIdAndUpdate(
        storeId, 
        { $set: flatUpdate }, 
        { new: true, runValidators: true }
    );

    if (!updatedStore) {
      return NextResponse.json({ message: 'Tienda no encontrada.' }, { status: 404 });
    }

    // AUDITORÍA: Registrar cambio
    await createLog({
        store: storeId,
        user: userId || 'SISTEMA',
        userName: userName || 'Admin',
        action: 'CONFIG_SISTEMA_ACTUALIZADA',
        module: 'Configuración',
        details: `Actualización de parámetros generales y datos de recaudación dinámica.`,
        targetId: storeId,
        newState: flatUpdate
    });

    return NextResponse.json(updatedStore, { status: 200 });
  } catch (error: any) {
    console.error('Error Crítico Settings PUT:', error);
    return NextResponse.json({ message: 'Error al actualizar configuración.', error: error.message }, { status: 500 });
  }
}
