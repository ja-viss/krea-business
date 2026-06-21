
import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint Maestro de Verificación de Segundo Nivel.
 * Valida las credenciales de hardware/desarrollador de 'javistech'.
 */

export async function POST(req: NextRequest) {
    try {
        const { user, key1, key2 } = await req.json();

        // VALORES HARDCODED POR SEGURIDAD MAESTRA (En prod deberían estar en variables de entorno cifradas)
        const MASTER_USER = 'javistech';
        const MASTER_KEY_A = 'krea2026';
        const MASTER_KEY_B = 'adminmaster';

        if (user === MASTER_USER && key1 === MASTER_KEY_A && key2 === MASTER_KEY_B) {
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
        return NextResponse.json({ message: 'Fallo de sistema de seguridad.' }, { status: 500 });
    }
}
