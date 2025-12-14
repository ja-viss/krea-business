
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';


// GET a single sale by ID
export async function GET(req: NextRequest, { params }: { params: { saleId: string } }) {
  try {
    await dbConnect();
    const { saleId } = params;

    if (!mongoose.Types.ObjectId.isValid(saleId)) {
        return NextResponse.json({ message: 'ID de venta inválido.' }, { status: 400 });
    }

    const sale = await SaleModel.findById(saleId).populate('customer');

    if (!sale) {
      return NextResponse.json({ message: 'Venta no encontrada.' }, { status: 404 });
    }

    return NextResponse.json(sale, { status: 200 });

  } catch (error) {
    console.error('Error al obtener la venta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener la venta.', error: errorMessage }, { status: 500 });
  }
}

    