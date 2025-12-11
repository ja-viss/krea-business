
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import { z } from 'zod';

const productSchema = z.object({
  storeId: z.string(),
  name: z.string().min(3),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio']),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  initialStock: z.number().min(0),
  minStock: z.number().min(0),
  unitCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  warehouseLocation: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.errors }, { status: 400 });
    }

    const { storeId, name, productType, barcode, sku, category, initialStock, minStock, unitCost, sellingPrice, warehouseLocation, imageUrl } = validation.data;

    // Determinar el estado inicial del stock
    let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock' = 'Sin Stock';
    if (initialStock > minStock) {
        status = 'En Stock';
    } else if (initialStock > 0) {
        status = 'Stock Bajo';
    }

    const newProduct = new ProductModel({
        store: storeId,
        name,
        productType,
        barcode: barcode || null,
        sku: sku || null,
        category,
        stock: initialStock,
        minStock,
        cost: unitCost,
        price: sellingPrice,
        location: warehouseLocation,
        imageUrl,
        status,
    });

    await newProduct.save();

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear el producto:', error);
    if (error.code === 11000) {
      const key = Object.keys(error.keyValue)[0];
      return NextResponse.json({ message: `Ya existe un producto con este ${key}.` }, { status: 409 });
    }
    if (error instanceof Error) {
        return NextResponse.json({ message: 'Error interno del servidor.', error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
