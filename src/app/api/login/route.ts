import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Credenciales obligatorias.' }, { status: 400 });
    }

    // Buscamos el usuario por su identificador, eliminando espacios accidentales
    const user = await UserModel.findOne({ email: email.trim() }).populate('role');

    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Bypass para Super Admin Global (Master Developer)
    if (user.isGlobalAdmin) {
        return NextResponse.json({ 
            message: 'Acceso Maestro Concedido.', 
            user: { 
                id: user._id.toString(), 
                name: user.name, 
                email: user.email, 
                store: 'SYSTEM_MASTER',
                role: 'SUPER_ADMIN'
            } 
        }, { status: 200 });
    }

    // Validación de tienda para usuarios regulares
    if (!user.store) {
      return NextResponse.json({ message: 'Usuario sin tienda asociada.' }, { status: 401 });
    }

    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            store: user.store.toString()
        } 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error Crítico en Login:', error);
    return NextResponse.json({ message: 'Error interno de servidor.', details: error.message }, { status: 500 });
  }
}
