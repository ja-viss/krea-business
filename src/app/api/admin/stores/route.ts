
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { encrypt, generateActivationToken } from '@/lib/encryption';
import crypto from 'crypto';

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
        const { 
            storeName, 
            adminName, 
            adminUser, 
            adminPassword, 
            tenantDbUri, 
            plan = 'Basic', 
            deploymentMode = 'Online' 
        } = body;

        // Definir límites basados en el plan
        let maxInvoices = 500;
        let maxUsers = 3;

        if (plan === 'Pro') {
            maxInvoices = 2000;
            maxUsers = 10;
        } else if (plan === 'Premium') {
            maxInvoices = 10000;
            maxUsers = 99;
        }

        // 1. Configuración de la Tienda (Tenant)
        const storeData: any = {
            name: storeName,
            address: 'Dirección pendiente por configurar',
            seniatCondition: 'Contribuyente Ordinario',
            status: (tenantDbUri || deploymentMode === 'Offline') ? 'Active' : 'Demo',
            plan,
            maxInvoicesPerMonth: maxInvoices,
            maxUsers: maxUsers,
            storageLimitMB: 500,
            deploymentMode
        };

        // Si es Online y se provee una URI, se cifra antes de guardar
        if (deploymentMode === 'Online' && tenantDbUri && tenantDbUri.trim() !== '') {
            storeData.tenantDbUri = encrypt(tenantDbUri.trim());
        }

        // Si es Offline, generamos credenciales de activación iniciales
        if (deploymentMode === 'Offline') {
            const secretKey = crypto.randomBytes(32).toString('hex');
            storeData.secretKey = secretKey;
            // Generamos un token temporal que podrá ser usado durante el handshake inicial
            // Usamos un placeholder ya que el storeId real se generará al guardar
            storeData.activationToken = generateActivationToken('PENDING_INSTALL', secretKey);
        }

        const newStore = new StoreModel(storeData);
        await newStore.save({ session });

        // Si era offline, actualizamos el token con el ID real
        if (deploymentMode === 'Offline') {
            newStore.activationToken = generateActivationToken(String(newStore._id), storeData.secretKey);
            await newStore.save({ session });
        }

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
            message: deploymentMode === 'Online' 
                ? 'Empresa provisionada con éxito en la nube.' 
                : 'Empresa preparada para despliegue offline con éxito.',
            storeId: newStore._id,
            userId: newUser._id,
            activationToken: newStore.activationToken
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
