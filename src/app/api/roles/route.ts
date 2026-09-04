import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RoleModel from '@/models/Role';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        if (!storeId) {
            return NextResponse.json({ message: 'ID de tienda requerido.' }, { status: 400 });
        }

        const query: any = {};
        if (storeId !== 'SYSTEM_MASTER') {
            query.store = new mongoose.Types.ObjectId(storeId);
        } else {
            query.isSystemRole = true;
        }

        const roles = await RoleModel.find(query).sort({ name: 1 });
        return NextResponse.json(roles);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
