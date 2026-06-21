
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SystemConfigModel from '@/models/SystemConfig';

/**
 * Endpoint Maestro de Verificación de Segundo Nivel.
 * Valida las credenciales dinámicas de la base de datos.
 */

export async function GET() {
    try {
        await dbConnect();
        // Verificamos si existe al menos un registro de configuración
        const config = await SystemConfigModel.findOne();
        return NextResponse.json({ initialized: !!config });
    } catch (e) {
        return NextResponse.json({ initialized: false }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { user, key1, key2 } = await req.json();

        if (!user || !key1 || !key2) {
            return NextResponse.json({ message: 'Todos los campos de seguridad son obligatorios.' }, { status: 400 });
        }

        // Recuperar configuración de seguridad de la DB
        let config = await SystemConfigModel.findOne();
        
        // MODO CONFIGURACIÓN: Si no existe configuración, la creamos con los datos que el admin acaba de ingresar
        if (!config) {
            config = await SystemConfigModel.create({
                masterUser: user,
                masterKeyAlpha: key1,
                masterKeyBeta: key2
            });
            
            return NextResponse.json({ 
                success: true, 
                message: 'Núcleo de seguridad inicializado con éxito.' 
            });
        }

        // Verificación estándar si ya existe config
        if (user === config.masterUser && key1 === config.masterKeyAlpha && key2 === config.masterKeyBeta) {
            return NextResponse.json({ 
                success: true, 
                message: 'Verificación de núcleo exitosa.' 
            });
        }

        return NextResponse.json({ 
            success: false, 
            message: 'Error en la secuencia de seguridad. Identidad no confirmada.' 
        }, { status: 401 });

    } catch (e: any) {
        console.error('Master Verify Error:', e);
        return NextResponse.json({ message: 'Fallo de sistema de seguridad.' }, { status: 500 });
    }
}
