
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CashSessionModel from '@/models/CashSession';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        if (!storeId) return NextResponse.json({ activeSession: null });

        const activeSession = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });

        if (activeSession) {
            // Lógica de agregación segura para IDs de tienda (ObjectIds o Strings)
            const matchQuery: any = { 
                createdAt: { $gte: activeSession.openedAt },
                status: 'Pagado'
            };

            // Solo convertir a ObjectId si no es el usuario maestro del sistema
            if (storeId !== 'SYSTEM_MASTER') {
                matchQuery.store = new mongoose.Types.ObjectId(storeId);
            } else {
                matchQuery.store = 'SYSTEM_MASTER';
            }

            const salesInSession = await SaleModel.aggregate([
                { $match: matchQuery },
                { $group: { 
                    _id: { method: '$paymentMethod', currency: '$paymentCurrency' }, 
                    total: { $sum: '$totalAmount' } 
                }}
            ]);
            
            return NextResponse.json({ 
                activeSession: activeSession.toObject(),
                theoreticalSales: salesInSession
            });
        }

        return NextResponse.json({ activeSession: null });
    } catch (e: any) {
        console.error('Error GET Cash Control:', e);
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, userId, openingBalances, action } = await req.json();

        if (action === 'OPEN') {
            const existing = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });
            if (existing) {
                return NextResponse.json({ message: "Ya existe un turno abierto para este terminal." }, { status: 400 });
            }

            const newSession = new CashSessionModel({
                store: storeId,
                user: userId,
                openingBalances,
                status: 'Abierta'
            });
            await newSession.save();
            return NextResponse.json(newSession);
        }
        
        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        console.error('Error POST Cash Control:', e);
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const { sessionId, declaredBalances, action, note } = await req.json();

        if (action === 'CLOSE') {
            const session = await CashSessionModel.findById(sessionId);
            if (!session) {
                return NextResponse.json({ message: "Sesión de caja no encontrada." }, { status: 404 });
            }

            session.declaredBalances = declaredBalances;
            session.status = 'Cerrada';
            session.closedAt = new Date();
            session.notes = note;
            
            await session.save();
            return NextResponse.json(session);
        }

        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        console.error('Error PUT Cash Control:', e);
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
