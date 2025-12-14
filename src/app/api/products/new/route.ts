
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import { z } from 'zod';

const productSchema = z.object({
  storeId: z.string().min(1, 'El ID de la tienda es obligatorio.'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio']),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
  stock: z.number().min(0, 'El stock no puede ser negativo.'),
  minStock: z.number().min(0, 'El stock mínimo no puede ser negativo.'),
  cost: z.number().min(0, 'El costo debe ser un número positivo.'),
  price: z.number().min(0, 'El precio debe ser un número positivo.'),
  location: z.string().optional(),
  imageUrl: z.string().url('La URL de la imagen debe ser válida.').optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { storeId, name, productType, barcode, sku, brand, vendor, category, stock, minStock, cost, price, location, imageUrl } = validation.data;

    // Determinar el estado inicial del stock
    let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
    if (stock <= 0) {
        status = 'Sin Stock';
    } else if (stock <= minStock) {
        status = 'Stock Bajo';
    } else {
        status = 'En Stock';
    }

    const newProduct = new ProductModel({
        store: storeId,
        name,
        productType,
        barcode,
        sku,
        brand,
        vendor,
        category,
        stock,
        minStock,
        cost,
        price,
        location,
        imageUrl,
        status,
    });

    await newProduct.save();

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error: any) {
    console.error('Error al crear el producto:', error);
    if (error.code === 11000) {
      const key = Object.keys(error.keyValue)[0];
       if (key === 'sku') {
        return NextResponse.json({ message: `El SKU '${error.keyValue.sku}' ya está registrado en esta tienda.` }, { status: 409 });
       }
       if (key === 'barcode') {
        return NextResponse.json({ message: `El código de barras '${error.keyValue.barcode}' ya está registrado en esta tienda.` }, { status: 409 });
       }
    }
    if (error instanceof Error) {
        return NextResponse.json({ message: 'Error interno del servidor.', error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}
