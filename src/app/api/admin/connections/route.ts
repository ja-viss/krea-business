
import { NextRequest, NextResponse } from 'next/server';
import { connectionPool } from '@/lib/tenant-manager';

export async function GET(req: NextRequest) {
    try {
        const metrics = Array.from(connectionPool.entries()).map(([tenantId, entry]) => ({
            tenantId,
            status: entry.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            uptime: Math.floor((Date.now() - entry.createdAt.getTime()) / 1000),
            models: Object.keys(entry.connection.models).length,
            host: entry.connection.host
        }));

        return NextResponse.json(metrics);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { tenantId, action } = await req.json();

        if (action === 'RESET' && tenantId) {
            const entry = connectionPool.get(tenantId);
            if (entry) {
                await entry.connection.close();
                connectionPool.delete(tenantId);
                return NextResponse.json({ message: `Pool de la empresa ${tenantId} drenado y reiniciado.` });
            }
        }

        return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
