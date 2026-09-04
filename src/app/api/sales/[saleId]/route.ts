
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import CustomerModel from '@/models/Customer';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';
import { createLog } from '@/app/api/audit-logs/route';


// GET a single sale by ID
export async function GET(req: NextRequest, { params }: { params: { saleId: string } }) {
  try {
    await dbConnect();
    const { saleId } = params;

    if (!mongoose.Types.ObjectId.isValid(saleId)) {
        return NextResponse.json({ message: 'ID de venta inválido.' }, { status: 400 });
    }

    const sale = await SaleModel.findById(saleId).populate({
        path: 'customer',
        model: CustomerModel
    });

    if (!sale) {
      return NextResponse.json({ message: 'Venta no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(sale, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener la venta:', error);
    const errorMessage = error.message || 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener la venta.', error: errorMessage }, { status: 500 });
  }
}

// DELETE a sale by ID (ANULACIÓN CRÍTICA)
export async function DELETE(req: NextRequest, { params }: { params: { saleId: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { saleId } = params;
        const userId = req.nextUrl.searchParams.get('userId') || 'SISTEMA';
        const userName = req.nextUrl.searchParams.get('userName') || 'Admin';

        if (!mongoose.Types.ObjectId.isValid(saleId)) {
            throw new Error('ID de venta inválido.');
        }

        const sale = await SaleModel.findById(saleId).session(session);
        if (!sale) {
            throw new Error('Venta no encontrada.');
        }

        // AUDITORÍA: Registrar antes de borrar
        await createLog({
            store: String(sale.store),
            user: userId,
            userName: userName,
            action: 'VENTA_ANULADA',
            module: 'Ventas',
            details: `Anulación de factura Nº ${sale.invoiceNumber}. Cliente: ${sale.customerName}. Monto: ${sale.totalAmount} Bs.`,
            targetId: String(sale._id),
            previousState: sale.toObject(),
            newState: { status: 'ANULADA_ELIMINADA' }
        });

        // Restaurar stock
        for (const item of sale.items) {
            await ProductModel.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        await SaleModel.findByIdAndDelete(saleId).session(session);
        
        await session.commitTransaction();
        return NextResponse.json({ message: 'Venta anulada y stock restaurado.' });

    } catch (error: any) {
        await session.abortTransaction();
        return NextResponse.json({ message: error.message }, { status: 500 });
    } finally {
        session.endSession();
    }
}
