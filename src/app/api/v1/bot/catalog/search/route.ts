
import { NextRequest, NextResponse } from 'next/server';
import { validateBotRequest } from '@/lib/bot-auth';
import { getTenantDb } from '@/lib/tenant-manager';

/**
 * GET /api/v1/bot/catalog/search?q=nombre&category=...
 * Consulta de stock para bots.
 */
export async function GET(req: NextRequest) {
    const store = await validateBotRequest(req);
    if (!store) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');

    const { models } = await getTenantDb(String(store._id), store.tenantDbUri || '');

    const filter: any = { 
        stock: { $gt: 0 },
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
        ]
    };

    if (category) filter.category = category;

    const products = await models.Product.find(filter)
        .limit(5)
        .select('name price category imageUrl status stock baseUnit')
        .lean();

    const formatted = products.map(p => ({
        id: p._id,
        name: p.name,
        price: p.price,
        currency: 'VES',
        category: p.category,
        image_url: p.imageUrl,
        in_stock: p.stock > 0,
        available_qty: p.stock,
        unit: p.baseUnit
    }));

    return NextResponse.json(formatted);
}
