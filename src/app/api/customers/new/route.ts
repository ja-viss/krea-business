
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CustomerModel from '@/models/Customer';
import { z } from 'zod';

const customerSchema = z.object({
  storeId: z.string().min(1, 'El ID de la tienda es obligatorio.'),
  idNumber: z.string().min(1, 'La cédula/ID es obligatoria.'),
  name: z.string().min(3, 'El nombre es obligatorio.'),
  phone: z.string().optional(),
  address: z.string().optional(),
});


export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { storeId, ...customerData } = validation.data;
    
    const newCustomer = new CustomerModel({
        store: storeId,
        ...customerData
    });

    await newCustomer.save();

    return NextResponse.json(newCustomer, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear el cliente:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: `Ya existe un cliente con esta cédula/ID en esta tienda.` }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al crear el cliente.', error: errorMessage }, { status: 500 });
  }
}

    