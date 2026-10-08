
import { NextRequest, NextResponse } from 'next/server';
import { validateBotRequest, maskName } from '@/lib/bot-auth';
import { getTenantDb } from '@/lib/tenant-manager';
import { differenceInDays } from 'date-fns';

/**
 * GET /api/v1/bot/orders/lookup?search=V-123456
 * Consulta de pedidos y apartados para clientes finales via Bot.
 */
export async function GET(req: NextRequest) {
    const store = await validateBotRequest(req);
    if (!store) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    if (search.length < 4) return NextResponse.json({ error: 'Búsqueda demasiado corta' }, { status: 400 });

    const { models } = await getTenantDb(String(store._id), store.tenantDbUri || '');

    // Buscar en Apartados (Layaways)
    const layaways = await models.Layaway.find({
        $or: [
            { 'customer.idNumber': { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
        ]
    }).limit(3).lean();

    // Buscar en Ventas (Sales)
    const sales = await models.Sale.find({
        invoiceNumber: parseInt(search) || 0
    }).limit(1).lean();

    const results = [
        ...layaways.map(l => {
            const daysLeft = differenceInDays(new Date(l.dates.expirationDate), new Date());
            return {
                type: 'APARTADO',
                code: l.code,
                customer: maskName(l.customer.name),
                status: l.status,
                items_count: l.items.length,
                total_usd: l.financials.totalAmountUsd,
                paid_usd: l.financials.paidAmountUsd,
                balance_usd: l.financials.remainingBalanceUsd,
                expiry_date: l.dates.expirationDate,
                days_to_expire: daysLeft,
                is_expired: daysLeft < 0
            };
        }),
        ...sales.map(s => ({
            type: 'DESPACHO',
            code: `NE-${s.invoiceNumber}`,
            customer: maskName(s.customerName),
            status: s.status,
            total_ves: s.totalAmount,
            date: s.createdAt
        }))
    ];

    return NextResponse.json(results);
}
