
import mongoose, { Connection, Model } from 'mongoose';
import { ProductSchema } from '@/models/schemas/ProductSchema';
import { SaleSchema } from '@/models/schemas/SaleSchema';
import { ExpenseSchema } from '@/models/schemas/ExpenseSchema';
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
  if (!encryptedUri) {
      throw new Error('URI de base de datos no proporcionada para el inquilino.');
  }

  if (connectionPool.has(tenantId)) {
    const conn = connectionPool.get(tenantId)!;
    if (conn.readyState === 1) {
      return { connection: conn, models: getModels(conn) };
    }
    connectionPool.delete(tenantId);
  }

  const dbUri = decrypt(encryptedUri);

  const tenantConnection = mongoose.createConnection(dbUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await tenantConnection.asPromise();
  
  connectionPool.set(tenantId, tenantConnection);

  console.log(`[Multi-Tenant] Nueva conexión establecida para el Tenant: ${tenantId}`);

  return { connection: tenantConnection, models: getModels(tenantConnection) };
}

function getModels(conn: Connection): TenantModels {
  return {
    Product: conn.models.Product || conn.model('Product', ProductSchema),
    Sale: conn.models.Sale || conn.model('Sale', SaleSchema),
    Expense: conn.models.Expense || conn.model('Expense', ExpenseSchema),
  };
}
