
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SystemConfigModel from '@/models/SystemConfig';

/**
 * Endpoint Maestro de Verificación de Segundo Nivel.
 * Valida las credenciales dinámicas de la base de datos o permite su inicialización.
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
        
        // MODO CONFIGURACIÓN INICIAL: Si no existe configuración, la creamos ahora mismo.
        if (!config) {
            config = await SystemConfigModel.create({
                masterUser: user,
                masterKeyAlpha: key1,
                masterKeyBeta: key2
            });
            
            return NextResponse.json({ 
                success: true, 
                message: 'Núcleo de seguridad inicializado y llaves maestras establecidas.' 
            });
        }

        // VERIFICACIÓN ESTÁNDAR: Comprobar contra las llaves guardadas
        const isValidUser = user === config.masterUser;
        const isValidAlpha = key1 === config.masterKeyAlpha;
        const isValidBeta = key2 === config.masterKeyBeta;

        if (isValidUser && isValidAlpha && isValidBeta) {
            return NextResponse.json({ 
                success: true, 
                message: 'Verificación de núcleo nivel 2 exitosa.' 
            });
        }

        return NextResponse.json({ 
            success: false, 
            message: 'Secuencia de seguridad incorrecta. Acceso denegado.' 
        }, { status: 401 });

    } catch (e: any) {
        console.error('Master Verify Critical Error:', e);
        return NextResponse.json({ message: 'Fallo catastrófico en el sistema de seguridad de infraestructura.' }, { status: 500 });
    }
}
