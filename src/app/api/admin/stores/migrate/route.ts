
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import mongoose from 'mongoose';
import { encrypt, decrypt } from '@/lib/encryption';
import { createLog } from '@/app/api/audit-logs/route';

/**
 * Protocolo de Migración Física de Datos v2.0 (ETL Streaming).
 * Mueve la información entre clústeres de MongoDB.
 */

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, newUri, keepOriginal } = await req.json();

        if (!storeId || !newUri) {
            return NextResponse.json({ message: 'ID y URI Destino obligatorios' }, { status: 400 });
        }

        const store = await StoreModel.findById(storeId);
        if (!store) return NextResponse.json({ message: 'Tienda no encontrada' }, { status: 404 });

        // 1. ACTIVAR MODO MANTENIMIENTO
        const originalStatus = store.status;
        store.status = 'Maintenance';
        await store.save();

        await createLog({
            store: storeId,
            user: 'SYSTEM',
            userName: 'Infraestructure Master',
            action: 'MIGRACION_INICIADA',
            module: 'Configuración',
            details: `Iniciando traslado de datos hacia nuevo clúster. Status: MAINTENANCE activado.`
        });

        // 2. VALIDAR CONEXIÓN DESTINO
        let targetConn;
        try {
            targetConn = await mongoose.createConnection(newUri).asPromise();
        } catch (e: any) {
            store.status = originalStatus;
            await store.save();
            return NextResponse.json({ message: 'No se pudo conectar al clúster destino: ' + e.message }, { status: 400 });
        }

        // 3. TRANSFERENCIA DE DATOS (COPIA POR LOTES)
        try {
            const sourceDb = store.tenantDbUri ? 
                mongoose.createConnection(decrypt(store.tenantDbUri)) : 
                mongoose.connection;
            
            if (store.tenantDbUri) await (sourceDb as any).asPromise();

            const db = (sourceDb as any).db || (sourceDb as any).connection?.db;
            const targetDb = targetConn.db;

            if (!db || !targetDb) throw new Error("Fallo en descriptores de base de datos");

            const collections = await db.listCollections().toArray();
            
            for (const colInfo of collections) {
                if (colInfo.name.includes('system.')) continue;

                const sourceCol = db.collection(colInfo.name);
                const targetCol = targetDb.collection(colInfo.name);

                // Filtrar por store si es DB compartida, sino todo
                const query = store.tenantDbUri ? {} : { store: new mongoose.Types.ObjectId(storeId) };
                const docs = await sourceCol.find(query).toArray();

                if (docs.length > 0) {
                    await targetCol.deleteMany({}); // Limpiar destino por seguridad
                    await targetCol.insertMany(docs);
                    
                    // Copiar índices básicos
                    const indexes = await sourceCol.indexes();
                    for (const idx of indexes) {
                        if (idx.name === '_id_') continue;
                        await targetCol.createIndex(idx.key, { name: idx.name, unique: idx.unique, sparse: idx.sparse });
                    }
                }
            }

            // 4. ACTUALIZAR METADATOS Y DESBLOQUEAR
            store.tenantDbUri = encrypt(newUri);
            store.status = 'Active';
            store.deploymentMode = 'Online';
            await store.save();

            await createLog({
                store: storeId,
                user: 'SYSTEM',
                userName: 'Infraestructure Master',
                action: 'MIGRACION_COMPLETADA',
                module: 'Configuración',
                details: `Migración exitosa. La empresa ya opera en su nuevo clúster dedicado.`
            });

            await targetConn.close();
            if (store.tenantDbUri) await (sourceDb as any).close();

            return NextResponse.json({ message: 'Migración finalizada con éxito.' });

        } catch (err: any) {
            store.status = originalStatus;
            await store.save();
            if (targetConn) await targetConn.close();
            throw err;
        }

    } catch (e: any) {
        console.error('MIGRATION FATAL ERROR:', e);
        return NextResponse.json({ message: 'Fallo crítico en el motor de migración.', error: e.message }, { status: 500 });
    }
}
