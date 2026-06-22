
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel from '@/models/Role'; // Importación necesaria para el populate
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * API de Login Robusta.
 * Maneja autenticación para Administradores Globales (Sin tienda) 
 * y Usuarios de Inquilinos (Multi-tenant).
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Credenciales obligatorias.' }, { status: 400 });
    }

    // Buscamos al usuario y poblamos su rol para conocer sus permisos
    const user = await UserModel.findOne({ 
        email: email.trim().toLowerCase() 
    }).populate({ path: 'role', model: RoleModel });

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

    // Configuración de módulos por defecto
    let enabledModules = { inventory: true, sales: true, expenses: true, reports: true };
    
    // Si el usuario pertenece a una tienda real, cargamos sus banderas de módulos (Feature Flags)
    if (user.store && mongoose.Types.ObjectId.isValid(user.store.toString())) {
        const store = await StoreModel.findById(user.store);
        if (store && store.enabledModules) {
            enabledModules = {
                inventory: store.enabledModules.inventory !== false,
                sales: store.enabledModules.sales !== false,
                expenses: store.enabledModules.expenses !== false,
                reports: store.enabledModules.reports !== false
            };
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
    return NextResponse.json({ 
        message: 'Error interno de servidor.',
        details: error.message 
    }, { status: 500 });
  }
}
