
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReturnModel from '@/models/Return';

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const storeId = req.nextUrl.searchParams.get('storeId');
        if (!storeId) return NextResponse.json({ message: 'ID tienda obligatorio' }, { status: 400 });

        const returns = await ReturnModel.find({ store: storeId }).sort({ createdAt: -1 });
        return NextResponse.json(returns);
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 500 });
    }
}
