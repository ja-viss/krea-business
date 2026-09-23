
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { encrypt } from '@/lib/encryption';
import { getTenantDb } from '@/lib/tenant-manager';

/**
 * API de Provisión de Infraestructura (Multi-Tenant).
 * Crea el registro en la DB Maestra e inicializa la DB Aislada del cliente.
 */
export async function POST(req: NextRequest) {
    await dbConnect(); // Conexión a DB Maestra
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await req.json();
        const { 
            storeName, 
            adminName, 
            adminUser, 
            adminPassword, 
            tenantDbUri, 
            plan = 'Basic' 
        } = body;

        if (!tenantDbUri) throw new Error("La URI de MongoDB para el aislamiento es obligatoria.");

        // 1. TEST DE CONECTIVIDAD (Pre-check)
        try {
            const testConn = mongoose.createConnection(tenantDbUri.trim());
            await testConn.asPromise();
            await testConn.close();
        } catch (e: any) {
            throw new Error(`Fallo de conexión a la DB del cliente: ${e.message}`);
        }

        // 2. REGISTRO EN BASE MAESTRA
        const encryptedUri = encrypt(tenantDbUri.trim());
        
        const newStore = new StoreModel({
            name: storeName,
            status: 'Active',
            plan,
            tenantDbUri: encryptedUri,
            maxUsers: plan === 'Premium' ? 99 : plan === 'Pro' ? 10 : 3,
            maxInvoicesPerMonth: plan === 'Premium' ? 10000 : plan === 'Pro' ? 2000 : 500,
        });

        await newStore.save({ session });

        // 3. REGISTRO DE USUARIO Y ROL (En Base Maestra para Auth Centralizada)
        const adminRole = new RoleModel({
            store: newStore._id,
            name: 'Administrador Principal',
            permissions: ['all'],
            isSystemRole: false
        });
        await adminRole.save({ session });

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

        // 4. INICIALIZACIÓN DE ESQUEMAS EN LA DB AISLADA (Seeding)
        const { models } = await getTenantDb(String(newStore._id), encryptedUri);
        
        // Inyectar producto de bienvenida en su propia DB
        await models.Product.create({
            name: 'Producto de Bienvenida (Krea)',
            productType: 'No Inventariable',
            price: 0,
            status: 'En Stock',
            store: newStore._id // Mantenemos referencia para compatibilidad
        });

        await session.commitTransaction();
        return NextResponse.json({ 
            message: 'Infraestructura aislada provisionada con éxito.',
            storeId: newStore._id
        }, { status: 201 });

    } catch (error: any) {
        await session.abortTransaction();
        console.error('FALLO EN PROVISIÓN DE TENANT:', error);
        return NextResponse.json({ message: error.message || 'Error interno de infraestructura' }, { status: 500 });
    } finally {
        session.endSession();
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const stores = await StoreModel.find().sort({ createdAt: -1 }).lean();
        const storesWithOwners = await Promise.all(stores.map(async (store) => {
            const owner = await UserModel.findOne({ store: store._id }).select('name email').lean();
            return { ...store, owner };
        }));
        return NextResponse.json(storesWithOwners);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
