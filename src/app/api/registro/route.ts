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

    // 2. Crear los roles para esta nueva tienda
    const adminRoleData = { name: ROLES.ADMIN, store: newStore._id, permissions: ['all'] };
    const managerRoleData = { name: ROLES.MANAGER, store: newStore._id, permissions: ['manage_inventory', 'view_reports'] };
    const cashierRoleData = { name: ROLES.CASHIER, store: newStore._id, permissions: ['use_pos'] };
    const inventoryRoleData = { name: ROLES.INVENTORY, store: newStore._id, permissions: ['manage_products'] };

    const [adminRole] = await RoleModel.create([adminRoleData, managerRoleData, cashierRoleData, inventoryRoleData], { session });

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
