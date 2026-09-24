
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function PATCH(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, collectionName, documentId, updateData, userId, userName } = await req.json();

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

        const collection = db.collection(collectionName);
        const query = { _id: new mongoose.Types.ObjectId(documentId) };

        const previousState = await collection.findOne(query);
        if (!previousState) throw new Error("Documento no encontrado");

        // Limpiar _id del updateData para evitar errores de inmutabilidad
        const { _id, ...cleanUpdate } = updateData;

        await collection.updateOne(query, { $set: cleanUpdate });
        const newState = await collection.findOne(query);

        // Registro de Auditoría Maestra
        await createLog({
            store: storeId || 'SYSTEM_MASTER',
            user: userId,
            userName: userName,
            action: 'DATA_STUDIO_EDIT',
            module: 'Infraestructura',
            details: `Edición manual de documento en colección '${collectionName}'.`,
            targetId: documentId,
            previousState,
            newState
        });

        return NextResponse.json({ message: 'Documento actualizado con éxito', newState });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, collectionName, documentId, userId, userName } = await req.json();

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

        const collection = db.collection(collectionName);
        const query = { _id: new mongoose.Types.ObjectId(documentId) };

        const previousState = await collection.findOne(query);
        if (!previousState) throw new Error("Documento no encontrado");

        await collection.deleteOne(query);

        // Registro de Auditoría Maestra
        await createLog({
            store: storeId || 'SYSTEM_MASTER',
            user: userId || 'SYSTEM',
            userName: userName || 'Admin',
            action: 'DATA_STUDIO_DELETE',
            module: 'Infraestructura',
            details: `Eliminación manual de documento en colección '${collectionName}'.`,
            targetId: documentId,
            previousState
        });

        return NextResponse.json({ message: 'Documento purgado exitosamente.' });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
