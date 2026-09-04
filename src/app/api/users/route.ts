import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    // Si es el Super Administrador Maestro, traemos todos los usuarios del sistema
    if (storeId === 'SYSTEM_MASTER') {
        const allUsers = await UserModel.find({ isGlobalAdmin: false })
            .select('-password')
            .populate('role')
            .populate({ path: 'store', model: StoreModel, select: 'name' })
            .sort({ createdAt: -1 });
        return NextResponse.json(allUsers, { status: 200 });
    }

    // Si es un usuario normal de tienda
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }
    
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const users = await UserModel.find({ store: storeObjectId })
        .select('-password')
        .populate('role')
        .populate({ path: 'store', model: StoreModel, select: 'name' });

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    return NextResponse.json({ message: 'Error al obtener los usuarios.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { name, email, password, roleId, storeId } = body;

        if (!name || !email || !password || !roleId || !storeId) {
            return NextResponse.json({ message: 'Todos los campos son obligatorios.' }, { status: 400 });
        }

        // Verificar si el usuario ya existe
        const existingUser = await UserModel.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ message: 'Este correo electrónico ya está registrado.' }, { status: 409 });
        }

        // Cifrar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new UserModel({
            store: storeId,
            name,
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: roleId,
            active: true,
            isGlobalAdmin: false
        });

        await newUser.save();

        return NextResponse.json({ message: 'Usuario registrado con éxito.' }, { status: 201 });
    } catch (error: any) {
        console.error('Error al crear usuario:', error);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
