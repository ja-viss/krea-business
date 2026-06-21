import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import mongoose from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: { storeId: string } }) {
    try {
        await dbConnect();
        const { storeId } = params;
        if (!mongoose.Types.ObjectId.isValid(storeId)) return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });

        const store = await StoreModel.findById(storeId);
        if (!store) return NextResponse.json({ message: 'No encontrada' }, { status: 404 });

        return NextResponse.json(store);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { storeId: string } }) {
    try {
        await dbConnect();
        const { storeId } = params;
        const body = await req.json();

        if (!mongoose.Types.ObjectId.isValid(storeId)) return NextResponse.json({ message: 'ID Inválido' }, { status: 400 });

        const updatedStore = await StoreModel.findByIdAndUpdate(storeId, body, { new: true });
        return NextResponse.json(updatedStore);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
