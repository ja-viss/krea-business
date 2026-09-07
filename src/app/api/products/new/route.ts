
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import { z } from 'zod';

const productSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(3),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio', 'Compuesto']),
  baseUnit: z.enum(['Unidad', 'Kilogramos', 'Gramos', 'Litros']).default('Unidad'),
  isWeightable: z.boolean().default(false),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
  stock: z.number().min(0),
  minStock: z.number().min(0),
  cost: z.number().min(0),
  price: z.number().min(0),
  taxRate: z.number().default(0.16),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { storeId, stock, minStock, ...data } = validation.data;

    let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
    if (stock <= 0) status = 'Sin Stock';
    else if (stock <= minStock) status = 'Stock Bajo';
    else status = 'En Stock';

    const newProduct = new ProductModel({
        store: storeId,
        stock,
        minStock,
        ...data,
        status,
    });

    await newProduct.save();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear el producto:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'El código o SKU ya existe en esta tienda.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
