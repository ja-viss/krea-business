
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

/**
 * Motor de Respaldo por Streaming para Multi-Tenant.
 * Extrae todas las colecciones del inquilino y genera un archivo de datos estructurado.
 */

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
            return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });
        }

        const store = await StoreModel.findById(storeId);
        if (!store) return NextResponse.json({ message: 'Tienda no encontrada' }, { status: 404 });

        // Conectar a la base de datos del inquilino (Central o Aislada)
        let db;
        if (store.tenantDbUri) {
            const { connection } = await getTenantDb(String(store._id), store.tenantDbUri);
            db = connection.db;
        } else {
            db = mongoose.connection.db;
        }

        if (!db) throw new Error("No se pudo acceder al motor de DB");

        // Obtener lista de colecciones relevantes para este tenant
        // Si es central, filtramos por storeId. Si es aislada, traemos todo.
        const collections = await db.listCollections().toArray();
        const backupData: Record<string, any[]> = {};

        for (const colInfo of collections) {
            const collection = db.collection(colInfo.name);
            const query = store.tenantDbUri ? {} : { store: new mongoose.Types.ObjectId(storeId) };
            
            // Si la colección es de sistema o counters, manejamos con cuidado
            if (colInfo.name.includes('system.') || colInfo.name.includes('sessions')) continue;

            const docs = await collection.find(query).toArray();
            if (docs.length > 0) {
                backupData[colInfo.name] = docs;
            }
        }

        const responseContent = JSON.stringify({
            version: "2.0",
            timestamp: new Date().toISOString(),
            storeId: store._id,
            storeName: store.name,
            data: backupData
        }, null, 2);

        return new NextResponse(responseContent, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename=backup_krea_${storeId}.json`
            }
        });

    } catch (e: any) {
        console.error('CRITICAL BACKUP FAILURE:', e);
        return NextResponse.json({ message: 'Error al generar el respaldo de infraestructura.', error: e.message }, { status: 500 });
    }
}
