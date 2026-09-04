
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AuditLogModel from '@/models/AuditLog';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        if (!storeId) return NextResponse.json({ message: 'ID Requerido' }, { status: 400 });

        const logs = await AuditLogModel.find({ store: storeId })
            .sort({ createdAt: -1 })
            .limit(100);
        return NextResponse.json(logs);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

// Función auxiliar interna para registrar logs desde otros endpoints
export async function createLog(data: { store: string, user: string, userName: string, action: string, module: string, details: string, targetId?: string }) {
    await dbConnect();
    const log = new AuditLogModel(data);
    await log.save();
}
