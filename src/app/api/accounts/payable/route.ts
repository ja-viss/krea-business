import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AccountPayableModel from '@/models/AccountPayable';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    const accountsPayable = await AccountPayableModel.find({ store: storeId }).sort({ dueDate: 1 });

    return NextResponse.json(accountsPayable, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las cuentas por pagar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las cuentas por pagar.', error: errorMessage }, { status: 500 });
  }
}
