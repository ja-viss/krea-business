
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel, { IRole } from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/**
 * Motor de Inicialización de Roles v2.0
 * Crea la jerarquía necesaria para que la empresa opere bajo el modelo Krea.
 */
async function seedStoreRoles(storeId: mongoose.Types.ObjectId, session: mongoose.ClientSession) {
    const rolesConfig = [
        { name: 'Administrador Principal', permissions: ['all'] },
        { name: 'Vendedor', permissions: ['manage_sales', 'view_dashboard'] },
        { name: 'Almacenista', permissions: ['manage_inventory'] },
        { name: 'Contador', permissions: ['view_reports', 'manage_expenses'] }
    ];

    const createdRoles = [];
    for (const config of rolesConfig) {
        let role = await RoleModel.findOne({ store: storeId, name: config.name }).session(session);
        if (!role) {
            role = new RoleModel({
                name: config.name,
                store: storeId,
                permissions: config.permissions,
                isSystemRole: false
            });
            await role.save({ session });
        }
        createdRoles.push(role);
    }
    return createdRoles;
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { businessName, email, password, name, isGlobalAdmin, roleName } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Todos los campos de identidad son obligatorios.' }, { status: 400 });
    }

    let storeId = null;
    let finalRoleId = null;

    // 1. GESTIÓN DE EMPRESA
    if (!isGlobalAdmin) {
        if (!businessName) return NextResponse.json({ message: 'El nombre del negocio es obligatorio.' }, { status: 400 });
        
        const newStore = new StoreModel({
          name: businessName,
          status: 'Demo',
          plan: 'Basic'
        });
        
        await newStore.save({ session });
        storeId = newStore._id as mongoose.Types.ObjectId;

        // SEEDING DE ROLES PARA LA NUEVA EMPRESA
        const storeRoles = await seedStoreRoles(storeId, session);
        
        // El creador de la empresa siempre es Administrador Principal
        const adminRole = storeRoles.find(r => r.name === 'Administrador Principal');
        finalRoleId = adminRole?._id;
    } else {
        // ROL DE SUPER DESARROLLADOR
        let masterRole = await RoleModel.findOne({ isSystemRole: true, name: 'SUPER_ADMIN_MASTER' }).session(session);
        if (!masterRole) {
            masterRole = new RoleModel({
                name: 'SUPER_ADMIN_MASTER',
                permissions: ['all'],
                isSystemRole: true
            });
            await masterRole.save({ session });
        }
        finalRoleId = masterRole._id;
    }

    // 2. SEGURIDAD DE ACCESO
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. REGISTRO DE USUARIO
    const newUser = new UserModel({
      store: storeId,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: finalRoleId,
      active: true,
      isGlobalAdmin: !!isGlobalAdmin
    });
    
    await newUser.save({ session });
    await session.commitTransaction();

    return NextResponse.json({ 
      message: isGlobalAdmin ? 'Perfil de Desarrollador Maestro activado.' : 'Empresa registrada con éxito.',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        store: newUser.store?.toString() || 'SYSTEM_MASTER',
        isGlobalAdmin: newUser.isGlobalAdmin
      }
     }, { status: 201 });

  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('REGISTRATION FAILURE:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ message: 'El usuario o email ya existe en Krea.' }, { status: 409 });
    }
    
    return NextResponse.json({ message: 'Fallo en la creación de cuenta: ' + error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}
