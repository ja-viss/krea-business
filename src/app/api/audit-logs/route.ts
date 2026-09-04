
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AuditLogModel from '@/models/AuditLog';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        if (!storeId) return NextResponse.json({ message: 'ID Requerido' }, { status: 400 });

        const query: any = { store: storeId };
        
        // Filtros opcionales
        const module = req.nextUrl.searchParams.get('module');
        const action = req.nextUrl.searchParams.get('action');
        if (module) query.module = module;
        if (action) query.action = action;

        const logs = await AuditLogModel.find(query)
            .sort({ createdAt: -1 })
            .limit(200);
            
        return NextResponse.json(logs);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

/**
 * Utilidad robusta para registrar auditoría desde cualquier endpoint interno.
 */
export async function createLog(data: { 
    store: string, 
    user: string, 
    userName: string, 
    action: string, 
    module: string, 
    details: string, 
    targetId?: string,
    previousState?: any,
    newState?: any
}) {
    try {
        await dbConnect();
        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') || '0.0.0.0';
        
        const log = new AuditLogModel({
            ...data,
            ipAddress: ip.split(',')[0]
        });
        await log.save();
    } catch (e) {
        console.error('CRITICAL: Failed to save audit log:', e);
    }
}
