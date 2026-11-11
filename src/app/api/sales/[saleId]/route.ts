
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';

// GET a single sale by ID with Tenant Isolation support
export async function GET(req: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  try {
    await dbConnect();
    const { saleId } = await params;
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!mongoose.Types.ObjectId.isValid(saleId)) {
        return NextResponse.json({ message: 'ID de venta inválido.' }, { status: 400 });
    }

    // Si no hay storeId, intentamos buscar en la DB maestra (legacy/shared)
    if (!storeId) {
        const SaleModel = (await import('@/models/Sale')).default;
        const CustomerModel = (await import('@/models/Customer')).default;
        const sale = await SaleModel.findById(saleId).populate({
            path: 'customer',
            model: CustomerModel
        });
        if (!sale) return NextResponse.json({ message: 'Venta no encontrada.' }, { status: 404 });
        return NextResponse.json(sale);
    }

    const store = await StoreModel.findById(storeId);
    if (!store) return NextResponse.json({ message: 'Tienda no encontrada.' }, { status: 404 });

    // Resolver conexión del inquilino
    const { models } = await getTenantDb(storeId, store.tenantDbUri || '');
    const sale = await models.Sale.findById(saleId).populate({
        path: 'customer',
        model: models.Customer
    });

    if (!sale) {
      return NextResponse.json({ message: 'Venta no encontrada en el nodo del cliente.' }, { status: 404 });
    }

    return NextResponse.json(sale, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener la venta:', error);
    return NextResponse.json({ message: 'Error interno de infraestructura.', error: error.message }, { status: 500 });
  }
}

// DELETE a sale by ID (ANULACIÓN CRÍTICA)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { saleId } = await params;
        const storeId = req.nextUrl.searchParams.get('storeId');
        const userId = req.nextUrl.searchParams.get('userId') || 'SISTEMA';
        const userName = req.nextUrl.searchParams.get('userName') || 'Admin';

        if (!storeId) throw new Error("ID tienda requerido para anulación");

        const store = await StoreModel.findById(storeId);
        if (!store) throw new Error("Tienda no encontrada");

        const { models } = await getTenantDb(storeId, store.tenantDbUri || '');

        const sale = await models.Sale.findById(saleId).session(session);
        if (!sale) throw new Error('Venta no encontrada.');

        // AUDITORÍA
        await createLog({
            store: storeId,
            user: userId,
            userName: userName,
            action: 'VENTA_ANULADA',
            module: 'Ventas',
            details: `Anulación de factura Nº ${sale.invoiceNumber}.`,
            targetId: String(sale._id),
            previousState: sale.toObject()
        });

        // Restaurar stock
        for (const item of sale.items) {
            await models.Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        await models.Sale.findByIdAndDelete(saleId).session(session);
        
        await session.commitTransaction();
        return NextResponse.json({ message: 'Venta anulada y stock restaurado.' });

    } catch (error: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
