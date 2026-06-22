
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';

/**
 * Endpoint de Productos (Protegido por Feature Flags).
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId || storeId === 'SYSTEM_MASTER') {
      return NextResponse.json({ message: 'Acceso no permitido.' }, { status: 400 });
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

    if (!store.tenantDbUri) {
      return NextResponse.json({ message: 'Infraestructura no configurada.' }, { status: 500 });
    }

    const { models } = await getTenantDb(String(store._id), store.tenantDbUri);
    const products = await models.Product.find().sort({ createdAt: -1 });

    return NextResponse.json(products, { status: 200 });

  } catch (error: any) {
    console.error('Error GET Products:', error);
    return NextResponse.json({ message: 'Error de conexión.' }, { status: 500 });
  }
}
