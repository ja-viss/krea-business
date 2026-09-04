
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CashSessionModel from '@/models/CashSession';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');

        // Buscar sesión abierta
        const activeSession = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });

        if (activeSession) {
            // Calcular ventas acumuladas en la sesión
            const salesInSession = await SaleModel.aggregate([
                { $match: { 
                    store: new mongoose.Types.ObjectId(storeId!), 
                    createdAt: { $gte: activeSession.openedAt },
                    status: 'Pagado'
                }},
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);
            
            return NextResponse.json({ 
                activeSession: {
                    ...activeSession.toObject(),
                    totalSalesInSession: salesInSession[0]?.total || 0
                }
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
        const { storeId, userId, amount, action } = await req.json();

        if (action === 'OPEN') {
            const existing = await CashSessionModel.findOne({ store: storeId, status: 'Abierta' });
            if (existing) throw new Error("Ya existe un turno abierto.");

            const newSession = new CashSessionModel({
                store: storeId,
                user: userId,
                openingAmount: amount,
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
        const { sessionId, closingAmount, action } = await req.json();

        if (action === 'CLOSE') {
            const session = await CashSessionModel.findById(sessionId);
            if (!session) throw new Error("Sesión no encontrada");

            // Obtener ventas reales para calcular diferencia
            const salesInSession = await SaleModel.aggregate([
                { $match: { 
                    store: session.store, 
                    createdAt: { $gte: session.openedAt },
                    status: 'Pagado'
                }},
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);

            const expectedAmount = session.openingAmount + (salesInSession[0]?.total || 0);
            
            session.closingAmount = closingAmount;
            session.expectedAmount = expectedAmount;
            session.difference = closingAmount - expectedAmount;
            session.status = 'Cerrada';
            session.closedAt = new Date();
            
            await session.save();
            return NextResponse.json(session);
        }

        return NextResponse.json({ message: 'Acción inválida' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
