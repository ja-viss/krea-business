import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import RoleModel from '@/models/Role';
import bcrypt from 'bcryptjs';

/**
 * Script de inicialización definitivo para el Super Administrador Maestro.
 * Endpoint: /api/system/seed-admin
 */
export async function GET(req: NextRequest) {
    try {
        console.log('Iniciando proceso de seeding maestro...');
        await dbConnect();

        // 1. Asegurar la existencia del Rol Maestro
        let superRole = await RoleModel.findOne({ name: 'SUPER_ADMIN_MASTER', isSystemRole: true });
        
        if (!superRole) {
            console.log('Creando rol SUPER_ADMIN_MASTER...');
            superRole = new RoleModel({
                name: 'SUPER_ADMIN_MASTER',
                permissions: ['all_access', 'manage_all_stores', 'bypass_billing'],
                isSystemRole: true,
                store: null
            });
            await superRole.save();
        }

        // 2. Preparar credenciales
        const masterUsername = 'javistech';
        const masterPassword = 'jojoto123';
        const hashedPassword = await bcrypt.hash(masterPassword, 10);

        // 3. Buscar y actualizar o crear al usuario
        // Usamos una búsqueda insensible a mayúsculas para mayor seguridad
        let masterUser = await UserModel.findOne({ email: masterUsername.toLowerCase() });
        
        if (masterUser) {
            console.log('Actualizando usuario javistech existente...');
            masterUser.password = hashedPassword;
            masterUser.isGlobalAdmin = true;
            masterUser.role = superRole._id;
            masterUser.name = 'Master Developer';
            masterUser.active = true;
            await masterUser.save();
            
            return NextResponse.json({ 
                success: true, 
                message: '¡USUARIO MAESTRO ACTUALIZADO!',
                credentials: {
                    usuario: masterUsername,
                    clave: masterPassword,
                    estado: 'Password reseteado con éxito'
                }
            }, { status: 200 });
        }

        console.log('Creando nuevo usuario javistech...');
        const newUser = new UserModel({
            name: 'Master Developer',
            email: masterUsername.toLowerCase(),
            password: hashedPassword,
            role: superRole._id,
            active: true,
            isGlobalAdmin: true,
            store: null
        });

        await newUser.save();

        return NextResponse.json({ 
            success: true,
            message: '¡SUPER ADMINISTRADOR REGISTRADO EXITOSAMENTE!',
            credentials: {
                usuario: masterUsername,
                clave: masterPassword
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error crítico en Seeding:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            tip: 'Verifica la conexión a MongoDB Atlas en tus variables de entorno.'
        }, { status: 500 });
    }
}
