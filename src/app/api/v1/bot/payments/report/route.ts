
import { NextRequest, NextResponse } from 'next/server';
import { validateBotRequest } from '@/lib/bot-auth';
import { createLog } from '@/app/api/audit-logs/route';

/**
 * POST /api/v1/bot/payments/report
 * Reporte de abono desde un Bot. Queda en estado PENDING_REVIEW.
 */
export async function POST(req: NextRequest) {
    const store = await validateBotRequest(req);
    if (!store) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    try {
        const body = await req.json();
        const { order_code, payment_method, amount, currency, reference_number } = body;

        if (!order_code || !amount || !reference_number) {
            return NextResponse.json({ error: 'Datos de pago incompletos' }, { status: 400 });
        }

        // En esta fase, registramos el reporte en el log de auditoría como un evento "PAYMENT_REPORTED_BY_BOT"
        // para que aparezca en el panel NOC y el administrador pueda procesarlo manualmente.
        await createLog({
            store: String(store._id),
            user: 'BOT_INTEGRATION',
            userName: 'WhatsApp/Bot API',
            action: 'BOT_PAYMENT_REPORTED',
            module: 'Finanzas',
            details: `Reporte de pago via Bot para orden ${order_code}. Monto: ${amount} ${currency}. Ref: ${reference_number}`,
            newState: { 
                status: 'PENDING_REVIEW',
                orderCode: order_code,
                method: payment_method,
                ref: reference_number 
            }
        });

        return NextResponse.json({
            success: true,
            message: "Reporte recibido. Un agente validará su pago pronto.",
            report_id: `REP-${Date.now()}`
        });

    } catch (e) {
        return NextResponse.json({ error: 'Error procesando reporte' }, { status: 500 });
    }
}
