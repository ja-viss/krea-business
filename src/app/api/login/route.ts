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

    // Busca un único usuario por el email. En una app multi-tienda real, podrías necesitar
    // un paso previo para identificar la tienda si no se pasa en el login.
    // Por simplicidad y para corregir el bug, buscamos el primer usuario que coincida.
    const user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    // Compara la contraseña proporcionada con la hasheada en la base de datos
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    if (!user.store) {
      return NextResponse.json({ message: 'La cuenta no está asociada a ninguna tienda.' }, { status: 401 });
    }

    // Si todo es correcto, devuelve los datos necesarios para la sesión del cliente
    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            store: user.store.toString()
        } 
    }, { status: 200 });

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    return NextResponse.json({ message: 'Error interno del servidor.', error: errorMessage }, { status: 500 });
  }
}
