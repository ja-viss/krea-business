
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StoreModel from '@/models/Store';
import { encrypt } from '@/lib/encryption';
import { getTenantDb } from '@/lib/tenant-manager';

/**
 * Endpoint de Provisión de Infraestructura (Exclusivo Super Admin).
 * Crea una empresa y prepara su base de datos aislada.
 */

export async function POST(req: NextRequest) {
  try {
    await dbConnect(); // Conexión a DB Maestra
    
    const body = await req.json();
    const { name, rif, dbUri } = body;

    // 1. Cifrar la URI de la base de datos del cliente antes de guardarla
    const encryptedUri = encrypt(dbUri);

    // 2. Registrar empresa en la base de datos central
    const newStore = new StoreModel({
      name,
      rif,
      address: 'Pendiente',
      status: 'Demo',
      // Guardamos la URI cifrada y un identificador único
      tenantDbUri: encryptedUri,
    });

    await newStore.save();

    // 3. Ejecutar Seeding Inicial en la nueva base de datos del cliente
    const { models } = await getTenantDb(String(newStore._id), encryptedUri);
    
    // Ejemplo: Crear un producto de bienvenida en su propia DB
    await models.Product.create({
      name: 'Producto de Ejemplo (Sistema)',
      productType: 'No Inventariable',
      price: 0,
      status: 'En Stock'
    });

    return NextResponse.json({ 
      message: 'Empresa provisionada y base de datos aislada configurada.',
      storeId: newStore._id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error de Provisión:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
