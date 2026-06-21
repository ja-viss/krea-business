
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SystemConfigModel from '@/models/SystemConfig';

/**
 * Endpoint Maestro de Verificación de Segundo Nivel.
 * Valida las credenciales dinámicas de la base de datos.
 */

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { user, key1, key2 } = await req.json();

        // Recuperar configuración de seguridad de la DB
        let config = await SystemConfigModel.findOne();
        
        // Inicializar si es la primera vez que se usa el sistema
        if (!config) {
            config = await SystemConfigModel.create({
                masterUser: 'javistech',
                masterKeyAlpha: 'krea2026',
                masterKeyBeta: 'adminmaster'
            });
        }

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
