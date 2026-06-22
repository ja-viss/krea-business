
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { generateActivationToken } from '@/lib/encryption';
import crypto from 'crypto';

/**
 * API para la gestión de despliegues offline (Exclusivo Super Admin).
 * Genera tokens de activación efímeros.
 */

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId } = await req.json();

        const store = await StoreModel.findById(storeId);
        if (!store) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });

        // Generar una llave secreta única para esta instalación si no existe
        const secretKey = store.secretKey || crypto.randomBytes(32).toString('hex');
        
        // Generar el token de activación firmado
        const token = generateActivationToken(String(store._id), secretKey);

        store.activationToken = token;
        store.secretKey = secretKey;
        store.deploymentMode = 'Offline';
        await store.save();

        return NextResponse.json({ 
            message: 'Token de activación generado con éxito.',
            token
        });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
