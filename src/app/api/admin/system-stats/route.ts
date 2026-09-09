
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import UserModel from '@/models/User';
import SaleModel from '@/models/Sale';
import AuditLogModel from '@/models/AuditLog';

/**
 * API de Control Estadístico Maestro.
 * Genera KPIs globales del ecosistema Krea.
 */
export async function GET() {
    try {
        await dbConnect();

        const [
            totalStores,
            totalUsers,
            totalSales,
            criticalLogs,
            activeSessions
        ] = await Promise.all([
            StoreModel.countDocuments(),
            UserModel.countDocuments({ isGlobalAdmin: false }),
            SaleModel.countDocuments({ status: 'Pagado' }),
            AuditLogModel.countDocuments({ action: { $regex: /ANULADA|ELIMINADO|MASTER/i } }),
            StoreModel.countDocuments({ status: 'Active' })
        ]);

        // Estadísticas de crecimiento (Simuladas para el dashboard)
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
                uptime: '99.99%'
            },
            health: {
                activeNodes: activeSessions,
                degradedNodes: 0,
                failedNodes: 0
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
