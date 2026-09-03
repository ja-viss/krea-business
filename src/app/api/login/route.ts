
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * API de Login Robusta.
 * Maneja autenticación para Administradores Globales y Usuarios de Inquilinos.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Credenciales obligatorias.' }, { status: 400 });
    }

    // Registro preventivo de modelos para evitar errores de populate
    if (!mongoose.models.Role) mongoose.model('Role', (RoleModel as any).schema);
    if (!mongoose.models.Store) mongoose.model('Store', (StoreModel as any).schema);

    const user = await UserModel.findOne({ 
        email: email.trim().toLowerCase() 
    }).populate({ path: 'role', model: RoleModel });

    if (!user) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }
    
    if (!user.active) {
      return NextResponse.json({ message: 'Usuario suspendido.' }, { status: 403 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    // Configuración de módulos por defecto
    let enabledModules = { inventory: true, sales: true, expenses: true, reports: true };
    
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
        message: 'Acceso concedido.', 
        user: { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            store: user.store?.toString() || 'SYSTEM_MASTER',
            isGlobalAdmin: !!user.isGlobalAdmin,
            needsVerification: false, // 2FA desactivado temporalmente para Super Developer
            enabledModules: enabledModules
        } 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ message: 'Error interno.', error: error.message }, { status: 500 });
  }
}
