
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CashSessionModel from '@/models/CashSession';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        const activeSession = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });

        if (activeSession) {
            // Calcular totales teóricos por moneda y método
            const salesInSession = await SaleModel.aggregate([
                { $match: { 
                    store: new mongoose.Types.ObjectId(storeId!), 
                    createdAt: { $gte: activeSession.openedAt },
                    status: 'Pagado'
                }},
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
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { storeId, userId, openingBalances, action } = await req.json();

        if (action === 'OPEN') {
            const existing = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });
            if (existing) throw new Error("Ya existe un turno abierto.");

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
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const { sessionId, declaredBalances, action, note } = await req.json();

        if (action === 'CLOSE') {
            const session = await CashSessionModel.findById(sessionId);
            if (!session) throw new Error("Sesión no encontrada");

            session.declaredBalances = declaredBalances;
            session.status = 'Cerrada';
            session.closedAt = new Date();
            session.notes = note;
            
            await session.save();
            return NextResponse.json(session);
        }

        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
