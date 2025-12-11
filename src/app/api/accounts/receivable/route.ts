import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AccountReceivableModel from '@/models/AccountReceivable';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }
    
    const accountsReceivable = await AccountReceivableModel.find({ store: storeId }).sort({ dueDate: 1 });

    return NextResponse.json(accountsReceivable, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las cuentas por cobrar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las cuentas por cobrar.', error: errorMessage }, { status: 500 });
  }
}
