import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint deshabilitado. 
 * El registro de administradores ahora se realiza a través de la interfaz de Signup estándar 
 * activando el modo "Super Desarrollador".
 */
export async function GET(req: NextRequest) {
    return NextResponse.json({ 
        message: 'Endpoint de seeding deshabilitado por seguridad. Utilice la página de registro (/signup) activando el modo Super Desarrollador.' 
    }, { status: 403 });
}
