import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Se filtra por storeId para asegurar el aislamiento de datos
    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }
    
    const users = await UserModel.find({ store: storeId }).select('-password').populate('role store');

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los usuarios.', error: errorMessage }, { status: 500 });
  }
}
