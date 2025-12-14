
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CustomerModel from '@/models/Customer';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const storeId = req.nextUrl.searchParams.get('storeId');
    const query = req.nextUrl.searchParams.get('query');
    
    if (!storeId) {
      return NextResponse.json({ message: 'El ID de la tienda es obligatorio.' }, { status: 400 });
    }

    if (!query || query.length < 2) {
      // Devuelve un arreglo vacío si la consulta es muy corta, en lugar de un error.
      return NextResponse.json([], { status: 200 });
    }
    
    const customers = await CustomerModel.find({
        store: storeId,
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { idNumber: { $regex: query, $options: 'i' } }
        ]
    }).limit(10);

    return NextResponse.json(customers, { status: 200 });

  } catch (error) {
    console.error('Error al buscar clientes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message: 'Error al buscar clientes.', error: errorMessage }, { status: 500 });
  }
}
