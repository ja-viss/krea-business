import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Credenciales obligatorias.' }, { status: 400 });
    }

    const user = await UserModel.findOne({ 
        email: email.trim().toLowerCase() 
    }).populate('role');

    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Respuesta unificada para usuarios normales y maestros
    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            store: user.store?.toString() || 'SYSTEM_MASTER',
            isGlobalAdmin: !!user.isGlobalAdmin
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
