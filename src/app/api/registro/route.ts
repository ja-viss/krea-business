import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel, { IRole } from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const ROLES = {
  ADMIN: 'Administrador Principal',
  MANAGER: 'Gerente',
  CASHIER: 'Cajero',
  INVENTORY: 'Inventario',
};

async function getOrCreateAdminRole(storeId: mongoose.Types.ObjectId, session: mongoose.ClientSession): Promise<IRole> {
    let adminRole = await RoleModel.findOne({ store: storeId, name: ROLES.ADMIN }).session(session);
    if (!adminRole) {
        // Si no existen roles, creamos el set inicial para la tienda
        const rolesToCreate = [
            { name: ROLES.ADMIN, store: storeId, permissions: ['all'] },
            { name: ROLES.MANAGER, store: storeId, permissions: ['manage_inventory', 'view_reports'] },
            { name: ROLES.CASHIER, store: storeId, permissions: ['use_pos'] },
            { name: ROLES.INVENTORY, store: storeId, permissions: ['manage_products'] },
        ];
        const createdRoles = await RoleModel.insertMany(rolesToCreate, { session });
        adminRole = createdRoles.find(role => role.name === ROLES.ADMIN)!;
    }
    return adminRole;
}


export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { businessName, email, password, name } = await req.json();

    if (!businessName || !email || !password || !name) {
      return NextResponse.json({ message: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    // 1. Crear la nueva tienda (Instancia de Negocio)
    const newStore = new StoreModel({
      name: businessName,
      address: 'Por definir', // Puede ser un campo opcional o llenarse después
    });
    await newStore.save({ session });

    // 2. Obtener o crear el rol de administrador para la nueva tienda
    const adminRole = await getOrCreateAdminRole(newStore._id, session);
    if (!adminRole) {
        throw new Error('No se pudo crear o encontrar el rol de administrador.');
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear el usuario administrador principal
    const newUser = new UserModel({
      store: newStore._id,
      name,
      email,
      password: hashedPassword,
      role: adminRole._id, // Asignar el rol de Administrador Principal
      active: true,
    });
    await newUser.save({ session });
    
    // Si todo fue bien, se confirma la transacción
    await session.commitTransaction();

    return NextResponse.json({ 
      message: 'Tienda y administrador registrados exitosamente.',
      user: {
        id: newUser._id,
        store: newUser.store
      }
     }, { status: 201 });
  } catch (error: any) {
    // Si algo falla, se revierte la transacción
    await session.abortTransaction();
    console.error('Error en el registro:', error);

    // Manejar error de email duplicado (código 11000)
    if (error.code === 11000) {
      return NextResponse.json({ message: 'El correo electrónico ya está en uso en esta tienda.' }, { status: 409 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error interno del servidor.', error: errorMessage }, { status: 500 });
  } finally {
    session.endSession();
  }
}
