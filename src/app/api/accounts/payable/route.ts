import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AccountPayableModel from '@/models/AccountPayable';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // For demonstration, let's create some data if the collection is empty.
    const count = await AccountPayableModel.countDocuments();
    if (count === 0) {
      await AccountPayableModel.create([
        { vendor: 'Proveedor X', dueDate: new Date('2024-07-10'), amount: 500.00, status: 'Pendiente' },
        { vendor: 'Proveedor Y', dueDate: new Date('2024-06-25'), amount: 300.00, status: 'Pagado' },
        { vendor: 'Servicios Z', dueDate: new Date('2024-07-15'), amount: 750.00, status: 'Pendiente' },
      ]);
    }

    const accountsPayable = await AccountPayableModel.find({}).sort({ dueDate: 1 });

    return NextResponse.json(accountsPayable, { status: 200 });

  } catch (error) {
    console.error('Error al obtener las cuentas por pagar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al obtener las cuentas por pagar.', error: errorMessage }, { status: 500 });
  }
}
