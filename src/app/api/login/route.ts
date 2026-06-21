import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role'; // Necesario para populate
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Credenciales obligatorias.' }, { status: 400 });
    }

    // Buscamos el usuario (email es el identificador) de forma insensible a mayúsculas
    const user = await UserModel.findOne({ 
        email: email.trim().toLowerCase() 
    }).populate('role');

    if (!user) {
      console.log(`Login fallido: Usuario no encontrado (${email})`);
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    // Verificación de contraseña
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      console.log(`Login fallido: Contraseña incorrecta para ${email}`);
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // --- ACCESO MAESTRO (isGlobalAdmin) ---
    if (user.isGlobalAdmin) {
        console.log(`Acceso Maestro concedido a: ${user.email}`);
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

    // --- ACCESO TIENDA (Usuarios regulares) ---
    if (!user.store) {
      return NextResponse.json({ message: 'Usuario sin tienda asociada.' }, { status: 401 });
    }

    console.log(`Login exitoso: ${user.email} en tienda ${user.store}`);
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
    console.error('Error Crítico en Login API:', error);
    return NextResponse.json({ 
        message: 'Error interno de servidor.', 
        details: error.message 
    }, { status: 500 });
  }
}
