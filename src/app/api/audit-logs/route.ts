
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AuditLogModel from '@/models/AuditLog';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        
        // El Super Dev puede ver todo si storeId es SYSTEM_MASTER
        let query: any = {};
        if (storeId && storeId !== 'SYSTEM_MASTER') {
            query.store = storeId;
        }

        const logs = await AuditLogModel.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
            
        return NextResponse.json(logs);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

/**
 * createLog: Utilidad centralizada para auditoría forense.
 * Se conecta a la DB Maestra y guarda el rastro de la operación.
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
        
        // Guardado persistente en DB Maestra
        await log.save();
        console.log(`[AUDIT] Acción registrada: ${data.action} por ${data.userName}`);
    } catch (e) {
        console.error('CRITICAL: Fallo al guardar log de auditoría:', e);
    }
}
