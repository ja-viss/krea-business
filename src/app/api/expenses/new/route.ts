
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ExpenseModel from '@/models/Expense';
import { z } from 'zod';

const expenseSchema = z.object({
  storeId: z.string().min(1, 'El ID de la tienda es obligatorio.'),
  description: z.string().min(3, 'La descripción es obligatoria.'),
  amount: z.number().positive('El monto debe ser positivo.'),
  category: z.string().min(1, 'La categoría es obligatoria.'),
  date: z.coerce.date({
    required_error: "La fecha es obligatoria.",
    invalid_type_error: "Formato de fecha inválido.",
  }),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const validation = expenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { storeId, ...expenseData } = validation.data;

    const newExpense = new ExpenseModel({
        store: storeId,
        ...expenseData
    });

    await newExpense.save();

    return NextResponse.json(newExpense, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear el gasto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al crear el gasto.', error: errorMessage }, { status: 500 });
  }
}
