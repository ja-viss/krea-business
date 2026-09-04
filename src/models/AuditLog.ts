
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  store: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  action: string;
  module: string;
  details: string;
  targetId?: string;
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
  targetId: { type: String },
  ipAddress: { type: String },
}, { timestamps: true });

const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLogModel;
