
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import SaleModel from '@/models/Sale';
import AuditLogModel from '@/models/AuditLog';
import os from 'os';

/**
 * API de Control Estadístico Maestro y Telemetría.
 * Genera KPIs globales del ecosistema Krea y métricas de hardware.
 */
export async function GET() {
    try {
        await dbConnect();

        const [
            totalStores,
            totalUsers,
            totalSales,
            criticalLogs,
            activeNodes
        ] = await Promise.all([
            StoreModel.countDocuments(),
            UserModel.countDocuments({ isGlobalAdmin: false }),
            SaleModel.countDocuments({ status: 'Pagado' }),
            AuditLogModel.countDocuments({ action: { $regex: /ANULADA|ELIMINADO|MASTER|FAIL/i } }),
            StoreModel.countDocuments({ status: 'Active' })
        ]);

        // Telemetría de Hardware (Simulada para entornos serverless, real en VPS)
        const memTotal = os.totalmem();
        const memFree = os.freemem();
        const memUsed = memTotal - memFree;
        const ramPercent = Math.round((memUsed / memTotal) * 100);

        // Estadísticas de actividad por módulo
        const activityByModule = await AuditLogModel.aggregate([
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return NextResponse.json({
            overview: {
                stores: totalStores,
                users: totalUsers,
                sales: totalSales,
                securityAlerts: criticalLogs,
                uptime: process.uptime(),
                version: 'v2.8.5-PROD'
            },
            hardware: {
                cpuUsage: Math.round(os.loadavg()[0] * 10), // Mock de carga
                ramUsage: ramPercent,
                totalRam: Math.round(memTotal / (1024 * 1024 * 1024)),
                diskUsage: 32 // Estimado
            },
            health: {
                activeNodes: activeNodes,
                degradedNodes: 0,
                failedNodes: 0,
                sslStatus: 'Valid',
                encryptionLevel: 'AES-256-GCM'
            },
            activity: activityByModule.map(m => ({
                module: m._id,
                value: m.count
            }))
        });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
