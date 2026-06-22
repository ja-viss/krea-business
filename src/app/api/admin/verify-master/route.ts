
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SystemConfigModel from '@/models/SystemConfig';

/**
 * Endpoint Maestro de Verificación de Segundo Nivel.
 * Soporta validación de acceso y configuración/sobrescritura del núcleo.
 */

export async function GET() {
    try {
        await dbConnect();
        const config = await SystemConfigModel.findOne();
        return NextResponse.json({ initialized: !!config });
    } catch (e) {
        return NextResponse.json({ initialized: false }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { user, key1, key2, mode } = await req.json();

        if (!user || !key1 || !key2) {
            return NextResponse.json({ message: 'Todos los campos de seguridad son obligatorios.' }, { status: 400 });
        }

        // MODO CONFIGURACIÓN: Sobrescribe o crea el núcleo (Permitido para el Admin logueado)
        if (mode === 'setup') {
            await SystemConfigModel.findOneAndUpdate(
                {}, 
                { 
                    masterUser: user, 
                    masterKeyAlpha: key1, 
                    masterKeyBeta: key2 
                }, 
                { upsert: true, new: true }
            );
            
            return NextResponse.json({ 
                success: true, 
                message: 'Núcleo de seguridad configurado. Se han establecido sus nuevas llaves maestras.' 
            });
        }

        // MODO VALIDACIÓN: Comprobar contra las llaves guardadas en DB
        const config = await SystemConfigModel.findOne();
        
        if (!config) {
            return NextResponse.json({ 
                message: 'El sistema no ha sido inicializado. Por favor, utilice la pestaña de Configurar.' 
            }, { status: 400 });
        }

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
