
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICashSession extends Document {
  store: Types.ObjectId;
  user: Types.ObjectId;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  status: 'Abierta' | 'Cerrada';
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
}

const CashSessionSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  openingAmount: { type: Number, required: true },
  closingAmount: { type: Number },
  expectedAmount: { type: Number },
  difference: { type: Number },
  status: { type: String, enum: ['Abierta', 'Cerrada'], default: 'Abierta' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  notes: { type: String },
}, { timestamps: true });

const CashSessionModel = mongoose.models.CashSession || mongoose.model<ICashSession>('CashSession', CashSessionSchema);
export default CashSessionModel;
