
import mongoose, { Connection, Model } from 'mongoose';
import { ProductSchema } from '@/models/schemas/ProductSchema';
import { SaleSchema } from '@/models/Sale';
import { ExpenseSchema } from '@/models/Expense';
import { decrypt } from './encryption';

/**
 * Gestor de Conexiones Multi-Tenant.
 * Mantiene un pool de conexiones en memoria para evitar latencia y saturación de sockets.
 */

interface TenantModels {
  Product: Model<any>;
  Sale: Model<any>;
  Expense: Model<any>;
}

const connectionPool: Map<string, Connection> = new Map();

export async function getTenantDb(tenantId: string, encryptedUri: string): Promise<{ connection: Connection, models: TenantModels }> {
  // 1. Verificar si ya tenemos una conexión activa para este inquilino
  if (connectionPool.has(tenantId)) {
    const conn = connectionPool.get(tenantId)!;
    // Si la conexión está lista, la devolvemos con sus modelos compilados
    if (conn.readyState === 1) {
      return { connection: conn, models: getModels(conn) };
    }
    // Si la conexión se cerró por timeout, la eliminamos del pool para re-conectar
    connectionPool.delete(tenantId);
  }

  // 2. Descifrar la URI de conexión (Seguridad en Reposo)
  const dbUri = decrypt(encryptedUri);

  // 3. Abrir nueva conexión en caliente
  const tenantConnection = mongoose.createConnection(dbUri, {
    maxPoolSize: 10, // Límite de conexiones por inquilino para no saturar Atlas
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  // Esperar a que la conexión se establezca
  await tenantConnection.asPromise();
  
  // 4. Almacenar en el pool global
  connectionPool.set(tenantId, tenantConnection);

  console.log(`[Multi-Tenant] Nueva conexión establecida para el Tenant: ${tenantId}`);

  return { connection: tenantConnection, models: getModels(tenantConnection) };
}

/**
 * Función interna para compilar esquemas sobre la conexión específica del inquilino.
 */
function getModels(conn: Connection): TenantModels {
  return {
    Product: conn.models.Product || conn.model('Product', ProductSchema),
    Sale: conn.models.Sale || conn.model('Sale', SaleSchema),
    Expense: conn.models.Expense || conn.model('Expense', ExpenseSchema),
  };
}
