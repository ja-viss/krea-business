import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel, { IRole } from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const ROLES = {
  ADMIN: 'Administrador Principal',
  MASTER: 'SUPER_ADMIN_MASTER'
};

async function getOrCreateAdminRole(storeId: mongoose.Types.ObjectId | null, session: mongoose.ClientSession, isMaster: boolean): Promise<IRole> {
    const roleName = isMaster ? ROLES.MASTER : ROLES.ADMIN;
    let role = await RoleModel.findOne({ store: storeId, name: roleName }).session(session);
    
    if (!role) {
        role = new RoleModel({
            name: roleName,
            store: storeId,
            permissions: ['all'],
            isSystemRole: isMaster
        });
        await role.save({ session });
    }
    return role;
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { businessName, email, password, name, isGlobalAdmin } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Nombre, Email y Contraseña son obligatorios.' }, { status: 400 });
    }

    let storeId = null;

    // 1. Si no es admin global, crear la tienda
    if (!isGlobalAdmin) {
        if (!businessName) return NextResponse.json({ message: 'El nombre de la tienda es obligatorio.' }, { status: 400 });
        const newStore = new StoreModel({
          name: businessName,
          address: 'Por definir',
        });
        await newStore.save({ session });
        storeId = newStore._id as mongoose.Types.ObjectId;
    }

    // 2. Obtener o crear el rol
    const role = await getOrCreateAdminRole(storeId, session, !!isGlobalAdmin);

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear el usuario
    const newUser = new UserModel({
      store: storeId,
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role._id,
      active: true,
      isGlobalAdmin: !!isGlobalAdmin
    });
    
    await newUser.save({ session });
    await session.commitTransaction();

    return NextResponse.json({ 
      message: isGlobalAdmin ? 'Super Desarrollador registrado.' : 'Tienda creada exitosamente.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        store: newUser.store || 'SYSTEM_MASTER',
        isGlobalAdmin: newUser.isGlobalAdmin
      }
     }, { status: 201 });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error en el registro:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'El usuario/email ya está registrado.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.', details: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}
