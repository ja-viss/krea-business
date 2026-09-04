import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * API de Login Unificada y Robusta.
 * Soporta Administración Global y Acceso Multi-Tenant.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ message: 'Credenciales obligatorias.' }, { status: 400 });
    }

    // Buscar usuario y popular rol
    const user = await UserModel.findOne({ email }).populate({ 
        path: 'role', 
        model: RoleModel 
    });

    if (!user) {
      return NextResponse.json({ message: 'Acceso denegado: Credenciales no reconocidas.' }, { status: 401 });
    }
    
    if (!user.active) {
      return NextResponse.json({ message: 'Cuenta suspendida por el administrador.' }, { status: 403 });
    }

    // Verificar contraseña con bcryptjs (Consistente en Render/Demo)
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Acceso denegado: Contraseña incorrecta.' }, { status: 401 });
    }

    // Configuración de módulos (Feature Flags)
    let enabledModules = { inventory: true, sales: true, expenses: true, reports: true };
    const storeIdStr = user.store ? user.store.toString() : 'SYSTEM_MASTER';
    
    // Si es un usuario vinculado a una tienda, cargar sus flags específicos
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
        message: 'Sesión iniciada correctamente.', 
        user: { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            store: storeIdStr,
            isGlobalAdmin: !!user.isGlobalAdmin,
            enabledModules: enabledModules
        } 
    }, { status: 200 });

  } catch (error: any) {
    console.error('CRITICAL LOGIN ERROR:', error);
    return NextResponse.json({ 
        message: 'Fallo interno en el proceso de autenticación.',
        error: error.message 
    }, { status: 500 });
  }
}
