import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel from '@/models/Role';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    // Si es el Super Administrador Maestro, traemos todos los usuarios del sistema
    if (storeId === 'SYSTEM_MASTER') {
        const allUsers = await UserModel.find({ isGlobalAdmin: false })
            .select('-password')
            .populate('role')
            .populate({ path: 'store', model: StoreModel, select: 'name' })
            .sort({ createdAt: -1 });
        return NextResponse.json(allUsers, { status: 200 });
    }

    // Si es un usuario normal de tienda
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }
    
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const users = await UserModel.find({ store: storeObjectId })
        .select('-password')
        .populate('role')
        .populate({ path: 'store', model: StoreModel, select: 'name' });

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los usuarios.', error: errorMessage }, { status: 500 });
  }
}
