
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import ProductModel from '@/models/Product';
import { getTenantDb } from '@/lib/tenant-manager';
import mongoose from 'mongoose';

/**
 * Endpoint de Productos (Híbrido: Central + Tenant DB).
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId || storeId === 'SYSTEM_MASTER') {
      return NextResponse.json({ message: 'Acceso no permitido.' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return NextResponse.json({ message: 'ID de tienda inválido.' }, { status: 400 });
    }

    const store = await StoreModel.findById(storeId);
    if (!store) return NextResponse.json({ message: 'Tienda inexistente.' }, { status: 404 });

    // --- PROTECCIÓN POR MÓDULO (BACKEND) ---
    if (store.enabledModules && store.enabledModules.inventory === false) {
        return NextResponse.json({ 
            message: 'Módulo de Inventario deshabilitado para esta empresa.',
            code: 'MODULE_DISABLED'
        }, { status: 403 });
    }

    if (store.status === 'Suspended' || store.status === 'Expired') {
      return NextResponse.json({ message: 'Suscripción inactiva.' }, { status: 403 });
    }

    let products;

    // Si tiene una base de datos aislada, usar el Tenant Manager
    if (store.tenantDbUri) {
      const { models } = await getTenantDb(String(store._id), store.tenantDbUri);
      products = await models.Product.find().sort({ createdAt: -1 });
    } else {
      // Fallback a base de datos central (para registros nuevos o sin Atlas propio)
      products = await ProductModel.find({ store: storeId }).sort({ createdAt: -1 });
    }

    return NextResponse.json(products || [], { status: 200 });

  } catch (error: any) {
    console.error('Error GET Products:', error);
    return NextResponse.json({ message: 'Error al procesar la solicitud de inventario.' }, { status: 500 });
  }
}
