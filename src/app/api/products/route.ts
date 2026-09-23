
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

/**
 * Endpoint de Productos (Arquitectura de Aislamiento Total).
 * Recupera los datos de la base de datos física del inquilino.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect(); // Conexión a DB Maestra para buscar la URI
    const storeId = req.nextUrl.searchParams.get('storeId');
    const search = req.nextUrl.searchParams.get('search');

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ message: 'Identificador de empresa inválido.' }, { status: 400 });
    }

    const store = await StoreModel.findById(storeId);
    if (!store) return NextResponse.json({ message: 'Agencia no reconocida.' }, { status: 404 });

    if (store.status === 'Suspended') {
      return NextResponse.json({ message: 'Empresa suspendida por falta de pago.' }, { status: 403 });
    }

    // --- CONECTAR AL NODO AISLADO DEL CLIENTE ---
    const { models } = await getTenantDb(String(store._id), store.tenantDbUri || '');
    
    let query: any = {};
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { barcode: { $regex: search, $options: 'i' } }
        ];
    }

    // Ejecutar consulta en la base de datos exclusiva del cliente
    const products = await models.Product.find(query).sort({ createdAt: -1 });

    return NextResponse.json(products || [], { status: 200 });

  } catch (error: any) {
    console.error('Error Crítico de Infraestructura (GET Products):', error);
    return NextResponse.json({ message: 'Fallo al contactar con el nodo de base de datos de la empresa.' }, { status: 500 });
  }
}
