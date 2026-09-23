
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import mongoose from 'mongoose';
import { connectionPool } from '@/lib/tenant-manager';
import { createLog } from '@/app/api/audit-logs/route';

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
    try {
        await dbConnect();
        const { storeId } = params;
        if (!mongoose.Types.ObjectId.isValid(storeId)) return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });

        const store = await StoreModel.findById(storeId);
        if (!store) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });

        return NextResponse.json(store);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
    try {
        await dbConnect();
        const { storeId } = params;
        const body = await req.json();

        if (!mongoose.Types.ObjectId.isValid(storeId)) return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });

        // INVALIDACIÓN DE CACHÉ: Si la URI cambió, cerramos el pool viejo
        const currentStore = await StoreModel.findById(storeId);
        if (currentStore && body.tenantDbUri && currentStore.tenantDbUri !== body.tenantDbUri) {
            console.log(`[INFRAESTRUCTURA] URI de empresa ${storeId} modificada. Purgando Pool...`);
            if (connectionPool.has(storeId)) {
                const entry = connectionPool.get(storeId);
                if (entry) {
                    await entry.connection.close();
                    connectionPool.delete(storeId);
                }
            }
        }

        const updatedStore = await StoreModel.findByIdAndUpdate(storeId, body, { new: true });
        
        await createLog({
            store: storeId,
            user: 'SYSTEM_ADMIN',
            userName: 'Super Desarrollador',
            action: 'EMPRESA_MODIFICADA',
            module: 'Infraestructura',
            details: `Actualización maestra de parámetros para: ${updatedStore?.name}`,
            newState: body
        });

        return NextResponse.json(updatedStore);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

/**
 * ELIMINACIÓN EN CASCADA (PROTOTIPO DE SEGURIDAD MÁXIMA)
 */
export async function DELETE(req: NextRequest, { params }: { params: { storeId: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { storeId } = params;
        if (!mongoose.Types.ObjectId.isValid(storeId)) throw new Error('ID Inválido');

        const store = await StoreModel.findById(storeId).session(session);
        if (!store) throw new Error('Empresa no existe');

        // 1. Drenar pool de conexiones si existe
        if (connectionPool.has(storeId)) {
            const entry = connectionPool.get(storeId);
            if (entry) {
                await entry.connection.close();
                connectionPool.delete(storeId);
            }
        }

        // 2. Borrado Cascada en DB Maestra
        await UserModel.deleteMany({ store: storeId }).session(session);
        await RoleModel.deleteMany({ store: storeId }).session(session);
        await StoreModel.findByIdAndDelete(storeId).session(session);

        // 3. Auditoría Global
        await createLog({
            store: 'SYSTEM_MASTER',
            user: 'SYSTEM_ADMIN',
            userName: 'Super Desarrollador',
            action: 'BORRADO_TOTAL_EMPRESA',
            module: 'Infraestructura',
            details: `Eliminación absoluta de la empresa ${store.name} (${storeId}) y toda su información vinculada.`,
            previousState: store.toObject()
        });

        await session.commitTransaction();
        return NextResponse.json({ message: 'Empresa purgada exitosamente del sistema.' });

    } catch (e: any) {
        await session.abortTransaction();
        console.error('FATAL DELETE ERROR:', e);
        return NextResponse.json({ message: 'Fallo al purgar empresa: ' + e.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
