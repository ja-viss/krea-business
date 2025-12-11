import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';
import StoreModel from '@/models/Store';

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
      return NextResponse.json({ message: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' }, { status: 401 });
    }

    // Intenta encontrar una coincidencia de contraseña en los usuarios encontrados
    let authenticatedUser = null;
    for (const user of users) {
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (isPasswordMatch) {
            authenticatedUser = user;
            break;
        }
    }
    
    if (!authenticatedUser) {
      return NextResponse.json({ message: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' }, { status: 401 });
    }

    // En una aplicación real, aquí se crearía una sesión o un JWT (JSON Web Token)
    // Para este ejemplo, devolvemos los IDs necesarios para que el cliente los guarde.
    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: authenticatedUser._id, 
            name: authenticatedUser.name, 
            email: authenticatedUser.email, 
            store: authenticatedUser.store._id 
        } 
    }, { status: 200 });

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    if (error instanceof Error) {
        return NextResponse.json({ message: 'Error interno del servidor.', error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
