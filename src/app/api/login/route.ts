import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'El correo electrónico y la contraseña son obligatorios.' }, { status: 400 });
    }

    // Buscamos al usuario por su email. En una arquitectura multi-tenant real,
    // se podría permitir el mismo email en diferentes tiendas, pero el modelo actual
    // lo hace único por tienda, así que buscar por email es seguro.
    const user = await UserModel.findOne({ email }).populate('role');
    
    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' }, { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas. Por favor, inténtalo de nuevo.' }, { status: 401 });
    }

    // En una aplicación real, aquí se crearía una sesión o un JWT (JSON Web Token)
    // Para este ejemplo, devolvemos los IDs necesarios para que el cliente los guarde.
    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: user._id, 
            name: user.name, 
            email: user.email, 
            store: user.store 
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
