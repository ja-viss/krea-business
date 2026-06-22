
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { decrypt } from '@/lib/encryption';

/**
 * Endpoint de Handshake Crítico.
 * Invocado por el cliente local durante la activación inicial.
 */

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { token, hardwareId } = await req.json();

        if (!token || !hardwareId) {
            return NextResponse.json({ message: 'Token e Identificador de Hardware son obligatorios.' }, { status: 400 });
        }

        // Buscar la empresa que tiene este token pendiente
        const store = await StoreModel.findOne({ activationToken: token });

        if (!store) {
            return NextResponse.json({ message: 'Token de activación inválido o ya utilizado.' }, { status: 401 });
        }

        // Vincular Hardware ID permanentemente (Bloqueo de máquina)
        store.offlineHardwareId = hardwareId;
        store.activationToken = undefined; // Quemar el token para que no se reuse
        await store.save();

        // Devolver configuración de infraestructura (La URI debe viajar cifrada o descifrarse para el cliente local)
        // En una arquitectura Database-per-Tenant, el cliente local recibe su URI de Atlas o Local.
        const dbUri = store.tenantDbUri ? decrypt(store.tenantDbUri) : 'mongodb://localhost:27017/krea_local';

        return NextResponse.json({
            success: true,
            config: {
                storeName: store.name,
                secretKey: store.secretKey,
                databaseUri: dbUri, // El cliente local la cifrará en su propio archivo de config
                licenseStatus: store.status,
                expiryDate: store.expiryDate
            }
        });

    } catch (e: any) {
        console.error('Fallo en Handshake Offline:', e);
        return NextResponse.json({ message: 'Error de protocolo de seguridad.' }, { status: 500 });
    }
}
