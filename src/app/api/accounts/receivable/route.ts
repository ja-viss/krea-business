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

    // For demonstration, let's create some data if the collection is empty.
    const count = await AccountReceivableModel.countDocuments({ store: storeId });
    if (count === 0) {
      await AccountReceivableModel.create([
        { store: storeId, customer: 'Cliente A', dueDate: new Date('2024-07-15'), amount: 1200.00, status: 'Pendiente' },
        { store: storeId, customer: 'Cliente B', dueDate: new Date('2024-06-20'), amount: 800.00, status: 'Atrasado' },
        { store: storeId, customer: 'Cliente C', dueDate: new Date('2024-07-01'), amount: 2500.00, status: 'Pendiente' },
      ]);
    }

    const accountsReceivable = await AccountReceivableModel.find({ store: storeId }).sort({ dueDate: 1 });

    return NextResponse.json(accountsReceivable, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las cuentas por cobrar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las cuentas por cobrar.', error: errorMessage }, { status: 500 });
  }
}
