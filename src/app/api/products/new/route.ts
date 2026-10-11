
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ProductModel from '@/models/Product';
import { z } from 'zod';
import mongoose from 'mongoose';

const productSchema = z.object({
  storeId: z.string().min(1, 'El ID de la tienda es obligatorio'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio', 'Compuesto']),
  baseUnit: z.enum(['Unidad', 'Kilogramos', 'Gramos', 'Litros', 'Mililitros']).default('Unidad'),
  isWeightable: z.boolean().default(false),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  stock: z.coerce.number().min(0, 'La existencia no puede ser negativa'),
  minStock: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo'),
  cost: z.coerce.number().min(0, 'El costo no puede ser negativo'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  taxRate: z.coerce.number().min(0).max(1, 'IVA inválido').default(0.16),
  imageUrl: z.string().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Datos del formulario inválidos.', 
        errors: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { storeId, stock, minStock, ...data } = validation.data;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ message: 'Identificador de tienda inválido.' }, { status: 400 });
    }

    // Sanitización de strings vacíos para evitar colisiones de índices únicos null/empty
    const cleanData: any = { ...data };
    if (!cleanData.barcode || cleanData.barcode.trim() === '') delete cleanData.barcode;
    if (!cleanData.sku || cleanData.sku.trim() === '') delete cleanData.sku;

    // Validación manual de duplicados por tienda
    if (cleanData.barcode) {
        const existingBarcode = await ProductModel.findOne({ store: storeId, barcode: cleanData.barcode });
        if (existingBarcode) return NextResponse.json({ message: `El código de barras '${cleanData.barcode}' ya está registrado en tu inventario.` }, { status: 409 });
    }

    let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
    if (stock <= 0) status = 'Sin Stock';
    else if (stock <= minStock) status = 'Stock Bajo';
    else status = 'En Stock';

    const newProduct = new ProductModel({
        store: new mongoose.Types.ObjectId(storeId),
        stock,
        minStock,
        ...cleanData,
        status,
    });

    await newProduct.save();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Fallo crítico al guardar en base de datos: ' + error.message }, { status: 500 });
  }
}
