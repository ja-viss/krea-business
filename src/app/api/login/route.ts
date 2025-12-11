import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';
import StoreModel from '@/models/Store'; // Importación necesaria para populate
import RoleModel from '@/models/Role';   // Importación necesaria para populate

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'El correo electrónico y la contraseña son obligatorios.' }, { status: 400 });
    }

    // Encuentra todos los usuarios con ese correo (puede estar en múltiples tiendas)
    const users = await UserModel.find({ email }).populate('role store');

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Intenta encontrar una coincidencia de contraseña en los usuarios encontrados
    let authenticatedUser = null;
    for (const user of users) {
        if (user.password) {
            const isPasswordMatch = await bcrypt.compare(password, user.password);
            if (isPasswordMatch) {
                authenticatedUser = user;
                break;
            }
        }
    }
    
    if (!authenticatedUser || !authenticatedUser.store) {
      return NextResponse.json({ message: 'Credenciales inválidas o la cuenta no está asociada a una tienda.' }, { status: 401 });
    }

    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: authenticatedUser._id.toString(), 
            name: authenticatedUser.name, 
            email: authenticatedUser.email, 
            store: authenticatedUser.store._id.toString()
        } 
    }, { status: 200 });

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return NextResponse.json({ message: 'Error interno del servidor.', error: errorMessage }, { status: 500 });
  }
}
