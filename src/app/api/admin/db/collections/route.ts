
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        let db;
        if (!storeId || storeId === 'SYSTEM_MASTER') {
            db = mongoose.connection.db;
        } else {
            const store = await StoreModel.findById(storeId);
            if (!store) throw new Error("Agencia no encontrada");
            const { connection } = await getTenantDb(storeId, store.tenantDbUri || '');
            db = connection.db;
        }

        if (!db) throw new Error("No se pudo acceder al motor de DB");

        const collections = await db.listCollections().toArray();
        const stats = await Promise.all(collections.map(async (col) => {
            const collection = db!.collection(col.name);
            const count = await collection.countDocuments();
            return {
                name: col.name,
                count,
                type: col.type
            };
        }));

        // Obtener estado del servidor
        let serverInfo = {};
        try {
            const sStatus = await db.command({ serverStatus: 1 });
            serverInfo = {
                version: sStatus.version,
                uptime: sStatus.uptime,
                connections: sStatus.connections,
                mem: sStatus.mem
            };
        } catch (err) {
            console.warn("No se pudo obtener serverStatus (Falta de permisos en cluster compartido)");
        }

        return NextResponse.json({ collections: stats, serverInfo });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
