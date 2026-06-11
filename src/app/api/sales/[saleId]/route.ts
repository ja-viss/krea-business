
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import CustomerModel from '@/models/Customer';
import ProductModel from '@/models/Product';
import mongoose from 'mongoose';


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

// DELETE a sale by ID
export async function DELETE(req: NextRequest, { params }: { params: { saleId: string } }) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { saleId } = params;

        if (!mongoose.Types.ObjectId.isValid(saleId)) {
            throw new Error('ID de venta inválido.');
        }

        // Find the sale to be deleted
        const sale = await SaleModel.findById(saleId).session(session);
        if (!sale) {
            throw new Error('Venta no encontrada.');
        }

        // Restore stock for each item in the sale
        for (const item of sale.items) {
            await ProductModel.findByIdAndUpdate(
                item.product,
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        // Delete the sale document
        const deletedSale = await SaleModel.findByIdAndDelete(saleId).session(session);
        
        if (!deletedSale) {
            throw new Error('No se pudo completar la eliminación de la venta.');
        }
        
        await session.commitTransaction();

        return NextResponse.json({ message: 'Venta eliminada y stock restaurado exitosamente.' }, { status: 200 });

    } catch (error: any) {
        await session.abortTransaction();
        console.error('Error al eliminar la venta:', error);
        const errorMessage = error.message || 'Error interno del servidor.';
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    } finally {
        session.endSession();
    }
}
