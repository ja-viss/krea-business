
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
        const { storeId, userId, userName, openingBalances, action, terminalName } = await req.json();

        if (action === 'OPEN') {
            const existing = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });
            if (existing) {
                return NextResponse.json({ message: "Ya existe un turno abierto en esta tienda." }, { status: 400 });
            }

            const newSession = new CashSessionModel({
                store: storeId,
                user: userId,
                userName: userName || 'Cajero',
                terminalName: terminalName || 'Caja Principal',
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
                details: `Apertura de turno en ${newSession.terminalName} con fondo inicial reportado.`
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
        const { sessionId, declaredBalances, action, notes, authorizedBy, closureMode } = await req.json();

        if (action === 'CLOSE') {
            const session = await CashSessionModel.findById(sessionId);
            if (!session) return NextResponse.json({ message: "Sesión no encontrada." }, { status: 404 });

            // 1. CUADRE AUTOMÁTICO: Calcular saldos teóricos basados ÚNICAMENTE en ventas vinculadas a esta sesión
            const salesInSession = await SaleModel.aggregate([
                { $match: { 
                    cashSession: session._id,
                    status: 'Pagado'
                }},
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

            // 2. Calcular Discrepancias contra lo declarado por el cajero
            const discrepancies = declaredBalances.map((decl: any) => {
                const theory = theoretical.find(t => t.method === decl.method && t.currency === decl.currency)?.amount || 0;
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
            session.closureMode = closureMode || 'blind';
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
                details: `Cierre de turno (${session.closureMode}) en ${session.terminalName}. Auditoría automática completada.`
            });

            return NextResponse.json(session);
        }

        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
