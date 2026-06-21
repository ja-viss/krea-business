
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import SystemConfigModel from '@/models/SystemConfig';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { 
            userId, 
            newPassword, 
            masterUser, 
            masterKeyAlpha, 
            masterKeyBeta 
        } = body;

        const user = await UserModel.findById(userId);
        if (!user || !user.isGlobalAdmin) {
            return NextResponse.json({ message: 'Acceso denegado.' }, { status: 403 });
        }

        // 1. Actualizar contraseña del primer login si se provee
        if (newPassword && newPassword.trim() !== '') {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            await user.save();
        }

        // 2. Actualizar llaves del segundo login (Master Challenge)
        let config = await SystemConfigModel.findOne();
        if (!config) config = new SystemConfigModel();

        if (masterUser) config.masterUser = masterUser;
        if (masterKeyAlpha) config.masterKeyAlpha = masterKeyAlpha;
        if (masterKeyBeta) config.masterKeyBeta = masterKeyBeta;

        await config.save();

        return NextResponse.json({ message: 'Credenciales maestras actualizadas con éxito.' });

    } catch (e: any) {
        console.error('Error Master Settings:', e);
        return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
    }
}
