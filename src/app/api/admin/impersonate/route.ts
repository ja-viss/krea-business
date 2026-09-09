
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import StoreModel from '@/models/Store';
import RoleModel from '@/models/Role';
import mongoose from 'mongoose';

/**
 * Protocolo de Suplantación (Impersonation).
 * Permite al Super Desarrollador acceder como cualquier administrador de agencia.
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { targetUserId } = await req.json();

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return NextResponse.json({ message: 'ID de usuario inválido.' }, { status: 400 });
        }

        const user = await UserModel.findById(targetUserId).populate({ path: 'role', model: RoleModel });
        if (!user) return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });

        const store = await StoreModel.findById(user.store);
        
        let enabledModules = { inventory: true, sales: true, expenses: true, reports: true };
        if (store && store.enabledModules) {
            enabledModules = {
                inventory: store.enabledModules.inventory !== false,
                sales: store.enabledModules.sales !== false,
                expenses: store.enabledModules.expenses !== false,
                reports: store.enabledModules.reports !== false
            };
        }

        return NextResponse.json({
            message: `Accediendo como ${user.name}...`,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                store: user.store?.toString() || 'SYSTEM_MASTER',
                roleName: user.role?.name || 'Administrador',
                isGlobalAdmin: false, // Forzamos false para entrar en modo tienda
                enabledModules: enabledModules
            }
        });

    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
