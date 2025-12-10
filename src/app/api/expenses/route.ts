import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ExpenseModel from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    const expenses = await ExpenseModel.find({ store: storeId }).sort({ date: -1 });

    return NextResponse.json(expenses, { status: 200 });

  } catch (error) {
    console.error('Error al obtener los gastos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener los gastos.', error: errorMessage }, { status: 500 });
  }
}
