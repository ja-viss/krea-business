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

    // For demonstration, let's create some data if the collection is empty for this store.
    const count = await AccountPayableModel.countDocuments({ store: storeId });
    if (count === 0) {
      await AccountPayableModel.create([
        { store: storeId, vendor: 'Proveedor X', dueDate: new Date('2024-07-10'), amount: 500.00, status: 'Pendiente' },
        { store: storeId, vendor: 'Proveedor Y', dueDate: new Date('2024-06-25'), amount: 300.00, status: 'Pagado' },
        { store: storeId, vendor: 'Servicios Z', dueDate: new Date('2024-07-15'), amount: 750.00, status: 'Pendiente' },
      ]);
    }

    const accountsPayable = await AccountPayableModel.find({ store: storeId }).sort({ dueDate: 1 });

    return NextResponse.json(accountsPayable, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las cuentas por pagar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las cuentas por pagar.', error: errorMessage }, { status: 500 });
  }
}
