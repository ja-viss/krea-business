
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { getTenantDb } from '@/lib/tenant-manager';

/**
 * Endpoint de Productos (Aislado por Tenant).
 * Detecta automáticamente a qué base de datos consultar.
 */

export async function GET(req: NextRequest) {
  try {
    // 1. Conectar a DB Maestra para obtener metadatos de la empresa
    await dbConnect();
    const storeId = req.nextUrl.searchParams.get('storeId');

    if (!storeId || storeId === 'SYSTEM_MASTER') {
      return NextResponse.json({ message: 'Acceso no permitido para este rol en esta ruta.' }, { status: 400 });
    }

    // 2. Obtener información de infraestructura y licencia
    const store = await StoreModel.findById(storeId);
    if (!store) return NextResponse.json({ message: 'Tienda inexistente.' }, { status: 404 });

    // 3. BLOQUEO POR LICENCIA: Si está suspendida, abortar inmediatamente
    if (store.status === 'Suspended' || store.status === 'Expired') {
      return NextResponse.json({ 
        message: 'Acceso denegado. Su suscripción está vencida o suspendida.',
        status: store.status 
      }, { status: 403 });
    }

    // 4. ENRUTAMIENTO DINÁMICO: Obtener modelos de la DB aislada del cliente
    if (!store.tenantDbUri) {
      return NextResponse.json({ message: 'Infraestructura de base de datos no configurada.' }, { status: 500 });
    }

    const { models } = await getTenantDb(String(store._id), store.tenantDbUri);

    // 5. OPERACIÓN: Consultar únicamente su base de datos
    const products = await models.Product.find().sort({ createdAt: -1 });

    return NextResponse.json(products, { status: 200 });

  } catch (error: any) {
    console.error('Error Multi-Tenant GET Products:', error);
    return NextResponse.json({ message: 'Error al conectar con la base de datos del cliente.' }, { status: 500 });
  }
}
