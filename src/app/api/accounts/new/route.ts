
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AccountPayableModel from '@/models/AccountPayable';
import AccountReceivableModel from '@/models/AccountReceivable';
import { z } from 'zod';

const transactionSchema = z.object({
  storeId: z.string().min(1, 'El ID de la tienda es obligatorio.'),
  type: z.enum(['payable', 'receivable'], { required_error: 'El tipo de transacción es obligatorio.' }),
  party: z.string().min(3, 'El nombre del cliente/proveedor es obligatorio.'),
  amount: z.coerce.number().positive('El monto debe ser un número positivo.'),
  dueDate: z.date({ required_error: 'La fecha de vencimiento es obligatoria.' }),
  status: z.enum(['Pendiente', 'Pagado', 'Atrasado']),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const parsedBody = {
      ...body,
      dueDate: new Date(body.dueDate),
    };

    const validation = transactionSchema.safeParse(parsedBody);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { storeId, type, party, amount, dueDate, status } = validation.data;

    if (type === 'payable') {
        const newPayable = new AccountPayableModel({
            store: storeId,
            vendor: party,
            amount,
            dueDate,
            status: status === 'Pagado' ? 'Pagado' : 'Pendiente',
        });
        await newPayable.save();
        return NextResponse.json(newPayable, { status: 201 });
    } else { // receivable
        const newReceivable = new AccountReceivableModel({
            store: storeId,
            customer: party,
            amount,
            dueDate,
            status: status === 'Pagado' ? 'Pagado' : (new Date() > dueDate ? 'Atrasado' : 'Pendiente'),
        });
        await newReceivable.save();
        return NextResponse.json(newReceivable, { status: 201 });
    }

  } catch (error: any) {
    console.error('Error al crear la transacción:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al crear la transacción.', error: errorMessage }, { status: 500 });
  }
}
