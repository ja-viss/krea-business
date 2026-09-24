
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

/**
 * API para recuperar estadísticas de espacio (dbStats) de un tenant.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        let db;
        if (!storeId || storeId === 'SYSTEM_MASTER') {
            db = mongoose.connection.db;
        } else {
            const store = await StoreModel.findById(storeId);
            if (!store) throw new Error("Empresa no encontrada");
            const { connection } = await getTenantDb(storeId, store.tenantDbUri || '');
            db = connection.db;
        }

        if (!db) throw new Error("No se pudo acceder al motor de DB");

        // Ejecutar comando dbStats nativo de MongoDB
        const stats = await db.command({ dbStats: 1 });

        return NextResponse.json({
            dbName: stats.db,
            collections: stats.collections,
            documents: stats.objects,
            dataSize: (stats.dataSize / (1024 * 1024)).toFixed(2), // MB
            indexSize: (stats.indexSize / (1024 * 1024)).toFixed(2), // MB
            totalSize: (stats.storageSize / (1024 * 1024)).toFixed(2), // MB
            avgObjSize: stats.avgObjSize.toFixed(2)
        });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
