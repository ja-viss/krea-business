
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  store: Types.ObjectId | string;
  user: Types.ObjectId | string;
  userName: string;
  action: string; 
  module: string; 
  details: string;
  previousState?: any; 
  newState?: any;      
  targetId?: string;   
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema({
  store: { type: Schema.Types.Mixed, required: true, index: true }, // Puede ser ID o 'SYSTEM'
  user: { type: Schema.Types.Mixed, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  module: { type: String, required: true },
  details: { type: String, required: true },
  previousState: { type: Schema.Types.Mixed },
  newState: { type: Schema.Types.Mixed },
  targetId: { type: String },
  ipAddress: { type: String },
}, { 
  timestamps: { createdAt: true, updatedAt: false },
  capped: { size: 52428800 } // 50MB de historial inmutable
});

AuditLogSchema.index({ store: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });

const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLogModel;
