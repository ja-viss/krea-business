
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ExpenseModel from '@/models/Expense';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return NextResponse.json({ message: 'El ID de la tienda es inválido o falta.' }, { status: 400 });
    }

    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const expenses = await ExpenseModel.find({ store: storeObjectId }).sort({ date: -1 });

    return NextResponse.json(expenses, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los gastos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los gastos.', error: errorMessage }, { status: 500 });
  }
}
