import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Proyectar solo los campos necesarios y excluir la contraseña
    const users = await UserModel.find({}).select('businessName email role createdAt');

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los usuarios.', error: errorMessage }, { status: 500 });
  }
}
