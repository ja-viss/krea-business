
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'El ID de la tienda es inválido o falta.' }, { status: 400 });
    }
    
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const users = await UserModel.find({ store: storeObjectId }).select('-password').populate('role store');

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los usuarios.', error: errorMessage }, { status: 500 });
  }
}
