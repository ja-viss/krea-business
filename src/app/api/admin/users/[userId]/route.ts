import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
    try {
        await dbConnect();
        const { userId } = params;
        const body = await req.json();
        const { password, active } = body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
        }

        const updateData: any = {};
        
        if (password && password.trim().length >= 6) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        if (active !== undefined) {
            updateData.active = active;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
        }

        const user = await UserModel.findByIdAndUpdate(userId, updateData, { new: true });
        
        if (!user) {
            return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Usuario actualizado con éxito.' }, { status: 200 });

    } catch (e: any) {
        console.error('Error Admin User PUT:', e);
        return NextResponse.json({ message: 'Error interno de servidor.', error: e.message }, { status: 500 });
    }
}
