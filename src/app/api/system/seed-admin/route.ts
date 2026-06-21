import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';

/**
 * Script de inicialización para el Super Administrador Maestro.
 * Este endpoint registra al usuario desarrollador 'javistech' con rol global.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Crear o recuperar el Rol de Super Administrador Global
        let superRole = await RoleModel.findOne({ name: 'SUPER_ADMIN_MASTER', isSystemRole: true });
        
        if (!superRole) {
            superRole = new RoleModel({
                name: 'SUPER_ADMIN_MASTER',
                permissions: ['all_access', 'manage_all_stores', 'bypass_billing'],
                isSystemRole: true,
                store: null // No pertenece a ninguna tienda específica
            });
            await superRole.save();
        }

        // 2. Verificar si el usuario ya existe
        const existingAdmin = await UserModel.findOne({ email: 'javistech' });
        if (existingAdmin) {
            return NextResponse.json({ message: 'El usuario javistech ya existe en el sistema.' }, { status: 200 });
        }

        // 3. Hashear contraseña maestra
        const hashedPassword = await bcrypt.hash('jojoto123', 10);

        // 4. Crear el Super Admin
        const masterUser = new UserModel({
            name: 'Master Developer',
            email: 'javistech',
            password: hashedPassword,
            role: superRole._id,
            active: true,
            isGlobalAdmin: true,
            store: null // Acceso global
        });

        await masterUser.save();

        return NextResponse.json({ 
            success: true,
            message: 'Super Administrador javistech registrado correctamente.',
            details: 'Rol Global SUPER_ADMIN_MASTER asignado. storeId: NULL'
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error en Seeding:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
