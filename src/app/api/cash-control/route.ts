
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CashSessionModel from '@/models/CashSession';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        if (!storeId) return NextResponse.json({ activeSession: null });

        const activeSession = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });
        return NextResponse.json({ activeSession });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, userId, userName, openingBalances, action } = await req.json();

        if (action === 'OPEN') {
            const existing = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });
            if (existing) {
                return NextResponse.json({ message: "Ya existe un turno abierto." }, { status: 400 });
            }

            const newSession = new CashSessionModel({
                store: storeId,
                user: userId,
                userName: userName || 'Cajero',
                openingBalances,
                status: 'Abierta'
            });
            await newSession.save();

            await createLog({
                store: storeId,
                user: userId,
                userName: userName || 'Cajero',
                action: 'APERTURA_CAJA',
                module: 'Ventas',
                details: `Apertura de turno con fondo inicial reportado.`
            });

            return NextResponse.json(newSession);
        }
        
        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const { sessionId, declaredBalances, action, notes, authorizedBy } = await req.json();

        if (action === 'CLOSE') {
            const session = await CashSessionModel.findById(sessionId);
            if (!session) return NextResponse.json({ message: "Sesión no encontrada." }, { status: 404 });

            // 1. Calcular saldos teóricos (Congelar ventas hasta este momento)
            const matchQuery: any = { 
                store: session.store === 'SYSTEM_MASTER' ? 'SYSTEM_MASTER' : new mongoose.Types.ObjectId(session.store),
                createdAt: { $gte: session.openedAt, $lte: new Date() },
                status: 'Pagado'
            };

            const salesInSession = await SaleModel.aggregate([
                { $match: matchQuery },
                { $group: { 
                    _id: { method: '$paymentMethod', currency: '$paymentCurrency' }, 
                    total: { $sum: '$totalAmount' } 
                }}
            ]);

            const theoretical = salesInSession.map(s => ({
                method: s._id.method,
                currency: s._id.currency || 'VES',
                amount: s.total
            }));

            // 2. Calcular Discrepancias
            const discrepancies = declaredBalances.map((decl: any) => {
                const theory = theoretical.find(t => t.method === decl.method && t.currency === decl.currency)?.amount || 0;
                // Sumar fondo inicial si es efectivo
                let base = 0;
                if (decl.method === 'Efectivo') {
                    base = session.openingBalances.find((b: any) => b.currency === decl.currency)?.amount || 0;
                }
                return {
                    method: decl.method,
                    currency: decl.currency,
                    difference: decl.amount - (theory + base)
                };
            });

            session.theoreticalBalances = theoretical;
            session.discrepancies = discrepancies;
            session.declaredBalances = declaredBalances;
            session.status = 'Cerrada';
            session.closedAt = new Date();
            session.notes = notes;
            session.authorizedBy = authorizedBy;
            
            await session.save();

            await createLog({
                store: session.store,
                user: session.user,
                userName: session.userName,
                action: 'CIERRE_CAJA',
                module: 'Ventas',
                details: `Cierre de turno finalizado. Notas: ${notes || 'Sin observaciones'}`
            });

            return NextResponse.json(session);
        }

        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
