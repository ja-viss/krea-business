
import mongoose, { Connection, Model } from 'mongoose';
import { ProductSchema } from '@/models/schemas/ProductSchema';
import { SaleSchema } from '@/models/schemas/SaleSchema';
import { ExpenseSchema } from '@/models/schemas/ExpenseSchema';
import { CustomerSchema } from '@/models/schemas/CustomerSchema';
import { AuditLogSchema } from '@/models/schemas/AuditLogSchema';
import { CashSessionSchema } from '@/models/schemas/CashSessionSchema';
import { decrypt } from './encryption';

/**
 * Gestor de Conexiones Multi-Tenant Proyectado.
 * Mantiene un pool de conexiones en memoria para evitar latencia y saturación de sockets.
 * Resuelve dinámicamente a qué base de datos física apuntar.
 */

interface TenantModels {
  Product: Model<any>;
  Sale: Model<any>;
  Expense: Model<any>;
  Customer: Model<any>;
  AuditLog: Model<any>;
  CashSession: Model<any>;
}

// Cache en memoria para reutilizar conexiones activas
const connectionPool: Map<string, Connection> = new Map();

export async function getTenantDb(tenantId: string, encryptedUri: string): Promise<{ connection: Connection, models: TenantModels }> {
  if (!encryptedUri) {
      throw new Error('La empresa no tiene una base de datos aislada configurada.');
  }

  // 1. Si ya existe una conexión saludable en el pool, la reutilizamos
  if (connectionPool.has(tenantId)) {
    const conn = connectionPool.get(tenantId)!;
    if (conn.readyState === 1) {
      return { connection: conn, models: getModels(conn) };
    }
    // Si la conexión murió, la removemos para crear una nueva
    connectionPool.delete(tenantId);
  }

  // 2. Desencriptar la URI real del cliente
  const dbUri = decrypt(encryptedUri);

  // 3. Crear nuevo pool de conexión dedicado
  const tenantConnection = mongoose.createConnection(dbUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
  });

  await tenantConnection.asPromise();
  
  // Guardar en cache
  connectionPool.set(tenantId, tenantConnection);

  console.log(`[INFRAESTRUCTURA] Conexión establecida para el Tenant Aislado: ${tenantId}`);

  return { connection: tenantConnection, models: getModels(tenantConnection) };
}

/**
 * Inyecta dinámicamente los esquemas sobre la conexión específica.
 */
function getModels(conn: Connection): TenantModels {
  return {
    Product: conn.models.Product || conn.model('Product', ProductSchema),
    Sale: conn.models.Sale || conn.model('Sale', SaleSchema),
    Expense: conn.models.Expense || conn.model('Expense', ExpenseSchema),
    Customer: conn.models.Customer || conn.model('Customer', CustomerSchema),
    AuditLog: conn.models.AuditLog || conn.model('AuditLog', AuditLogSchema),
    CashSession: conn.models.CashSession || conn.model('CashSession', CashSessionSchema),
  };
}
