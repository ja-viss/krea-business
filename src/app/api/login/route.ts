
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
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
    
    if (!user.active) {
      return NextResponse.json({ message: 'Usuario suspendido. Contacte a soporte.' }, { status: 403 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Obtener los módulos habilitados de la tienda
    let enabledModules = { inventory: true, sales: true, expenses: true, reports: true };
    if (user.store) {
        const store = await StoreModel.findById(user.store);
        if (store) {
            enabledModules = store.enabledModules || enabledModules;
        }
    }

    return NextResponse.json({ 
        message: 'Inicio de sesión exitoso.', 
        user: { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            store: user.store?.toString() || 'SYSTEM_MASTER',
            isGlobalAdmin: !!user.isGlobalAdmin,
            needsVerification: !!user.isGlobalAdmin,
            enabledModules: enabledModules
        } 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error Crítico en Login API:', error);
    return NextResponse.json({ message: 'Error interno de servidor.' }, { status: 500 });
  }
}
