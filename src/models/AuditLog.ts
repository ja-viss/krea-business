
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  store: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  action: string; // e.g., 'SALE_ANNULLED', 'PRODUCT_PRICE_UPDATED', 'CONFIG_CHANGED'
  module: string; // e.g., 'Ventas', 'Inventario', 'Seguridad', 'Configuración'
  details: string;
  previousState?: any; // Snapshot antes del cambio
  newState?: any;      // Snapshot después del cambio
  targetId?: string;   // ID del documento afectado (Factura, Producto, etc)
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  module: { type: String, required: true },
  details: { type: String, required: true },
  previousState: { type: Schema.Types.Mixed },
  newState: { type: Schema.Types.Mixed },
  targetId: { type: String },
  ipAddress: { type: String },
}, { 
  timestamps: { createdAt: true, updatedAt: false }, // Inmutable: No hay updatedAt
  capped: { size: 52428800 } // Opcional: 50MB de historial circular si se desea limitar
});

// Índice para búsquedas rápidas por fecha y acción
AuditLogSchema.index({ store: 1, createdAt: -1 });
AuditLogSchema.index({ store: 1, action: 1 });

const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLogModel;
