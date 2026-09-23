
import { Schema } from 'mongoose';

export const AuditLogSchema: Schema = new Schema({
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
  timestamps: { createdAt: true, updatedAt: false },
  capped: { size: 52428800 } // 50MB circular buffer
});

AuditLogSchema.index({ store: 1, createdAt: -1 });
