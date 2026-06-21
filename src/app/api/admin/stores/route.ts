import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const stores = await StoreModel.find().sort({ createdAt: -1 });
        return NextResponse.json(stores);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { storeName, adminName, adminUser, adminPassword } = await req.json();

        // 1. Crear la Tienda
        const newStore = new StoreModel({
            name: storeName,
            address: 'Dirección pendiente por configurar',
            seniatCondition: 'Contribuyente Ordinario',
        });
        await newStore.save({ session });

        // 2. Crear el Rol de Administrador para esa tienda
        const adminRole = new RoleModel({
            store: newStore._id,
            name: 'Administrador Principal',
            permissions: ['all'],
            isSystemRole: false
        });
        await adminRole.save({ session });

        // 3. Crear el Usuario Administrador
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const newUser = new UserModel({
            store: newStore._id,
            name: adminName,
            email: adminUser.trim().toLowerCase(),
            password: hashedPassword,
            role: adminRole._id,
            active: true,
            isGlobalAdmin: false
        });
        await newUser.save({ session });

        await session.commitTransaction();
        return NextResponse.json({ message: 'Empresa y Administrador creados con éxito.' }, { status: 201 });

    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error al crear tienda:', error);
        return NextResponse.json({ 
            message: error.code === 11000 ? 'El nombre de usuario ya está ocupado.' : error.message 
        }, { status: 500 });
    } finally {
        session.endSession();
    }
}
