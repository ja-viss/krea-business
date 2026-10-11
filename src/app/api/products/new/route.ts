
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
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
  brand: z.string().optional().nullable(),
  category: z.string().min(1, 'Selecciona una categoría.'),
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
    await dbConnect(); // Conexión a Master para obtener configuración del tenant
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

    const store = await StoreModel.findById(storeId);
    if (!store) return NextResponse.json({ message: 'Empresa no encontrada.' }, { status: 404 });

    // --- CONECTAR AL NODO AISLADO DEL CLIENTE ---
    const { models } = await getTenantDb(String(store._id), store.tenantDbUri || '');

    // SANITIZACIÓN CRÍTICA PARA EVITAR E11000 (Duplicate Key Error on null/empty)
    // Si el usuario no envía SKU o Barras, eliminamos las llaves para que el índice "sparse" funcione correctamente.
    const cleanData: any = { ...data };
    if (!cleanData.barcode || cleanData.barcode.trim() === '') delete cleanData.barcode;
    if (!cleanData.sku || cleanData.sku.trim() === '') delete cleanData.sku;

    // Validación de duplicados manual en el nodo del inquilino (Opcional, los índices ya protegen)
    if (cleanData.barcode) {
        const existingBarcode = await models.Product.findOne({ barcode: cleanData.barcode });
        if (existingBarcode) return NextResponse.json({ message: `El código de barras '${cleanData.barcode}' ya existe en tu inventario.` }, { status: 409 });
    }

    let status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
    if (stock <= 0) status = 'Sin Stock';
    else if (stock <= minStock) status = 'Stock Bajo';
    else status = 'En Stock';

    const newProduct = new models.Product({
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
    
    // Captura específica de errores de duplicidad para dar feedback amigable
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] === 'sku' ? 'SKU' : 'Código de Barras';
        return NextResponse.json({ message: `Conflicto de Identidad: El ${field} ya está registrado en otro producto.` }, { status: 409 });
    }

    return NextResponse.json({ message: 'Fallo crítico al guardar en el nodo de base de datos del cliente.' }, { status: 500 });
  }
}
