
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RoleModel from '@/models/Role';
import mongoose from 'mongoose';

/**
 * Gestión de Roles (Multi-tenant).
 * Permite listar roles de la tienda + roles base del sistema.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        if (!storeId) {
            return NextResponse.json({ message: 'ID de tienda requerido.' }, { status: 400 });
        }

        const query: any = {};
        if (storeId === 'SYSTEM_MASTER') {
            query.isSystemRole = true;
        } else {
            // Retorna roles que pertenecen a la tienda O son roles base del sistema (templates)
            query.$or = [
                { store: new mongoose.Types.ObjectId(storeId) },
                { isSystemRole: true, store: null }
            ];
        }

        const roles = await RoleModel.find(query).sort({ isSystemRole: -1, name: 1 });
        return NextResponse.json(roles);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

/**
 * Crear un nuevo rol personalizado para la tienda.
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, name, permissions } = await req.json();

        if (!storeId || !name || !permissions) {
            return NextResponse.json({ message: 'Faltan campos obligatorios.' }, { status: 400 });
        }

        const newRole = new RoleModel({
            store: storeId,
            name,
            permissions,
            isSystemRole: false
        });

        await newRole.save();
        return NextResponse.json(newRole, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
