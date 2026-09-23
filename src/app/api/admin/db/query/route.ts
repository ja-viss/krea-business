
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, collectionName, filter = {}, sort = { _id: -1 }, limit = 50, skip = 0 } = await req.json();

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

        const collection = db.collection(collectionName);
        
        // Sanitizar filtro: Convertir $oid si existe
        const sanitizedFilter = JSON.parse(JSON.stringify(filter), (key, value) => {
            if (key === '_id' && typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
                return new mongoose.Types.ObjectId(value);
            }
            if (value && typeof value === 'object' && value.$oid) {
                return new mongoose.Types.ObjectId(value.$oid);
            }
            return value;
        });

        const documents = await collection.find(sanitizedFilter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();

        return NextResponse.json(documents);

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
