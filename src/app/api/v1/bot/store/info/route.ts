
import { NextRequest, NextResponse } from 'next/server';
import { validateBotRequest } from '@/lib/bot-auth';

/**
 * GET /api/v1/bot/store/info
 * Retorna datos operativos y tasas para el bot.
 */
export async function GET(req: NextRequest) {
    const store = await validateBotRequest(req);
    if (!store) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // En un entorno real, aquí se consultaría la tasa BCV del día o la guardada
    // Por ahora simulamos la respuesta basada en el contexto de Krea
    return NextResponse.json({
        store_name: store.name,
        rif: store.rif,
        address: store.address,
        phone: store.phone,
        business_type: store.businessType,
        payment_methods: ['Efectivo USD/VES', 'Pago Móvil', 'Zelle'],
        exchange_rates: {
            usd_ves: 52.45, // Simulado: Debería venir de un cache de tasas
            cop_usd: 3900.00
        },
        status: store.status
    });
}
