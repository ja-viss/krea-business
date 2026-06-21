import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { encrypt } from '@/lib/encryption';

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
        const body = await req.json();
        const { storeName, adminName, adminUser, adminPassword, tenantDbUri } = body;

        // 1. Crear la Tienda (Tenant) con su URI de DB cifrada
        const storeData: any = {
            name: storeName,
            address: 'Dirección pendiente por configurar',
            seniatCondition: 'Contribuyente Ordinario',
            status: tenantDbUri ? 'Active' : 'Demo',
        };

        // Si se provee una URI, se cifra antes de guardar
        if (tenantDbUri && tenantDbUri.trim() !== '') {
            storeData.tenantDbUri = encrypt(tenantDbUri.trim());
        }

        const newStore = new StoreModel(storeData);
        await newStore.save({ session });

        // 2. Crear el Rol de Administrador para esa tienda
        const adminRole = new RoleModel({
            store: newStore._id,
            name: 'Administrador Principal',
            permissions: ['all'],
            isSystemRole: false
        });
        await adminRole.save({ session });

        // 3. Crear el Usuario Administrador vinculado a la tienda
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
        return NextResponse.json({ 
            message: 'Empresa provisionada con éxito.',
            storeId: newStore._id,
            userId: newUser._id
        }, { status: 201 });

    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error al provisionar tienda:', error);
        
        let message = 'Error interno al provisionar la infraestructura.';
        if (error.code === 11000) {
            message = 'El nombre de usuario o la empresa ya existen.';
        } else if (error.message) {
            message = error.message;
        }

        return NextResponse.json({ message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
