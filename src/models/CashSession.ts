
import mongoose, { Schema, Document } from 'mongoose';

export interface ICashSession extends Document {
  store: string; // Cambiado a string para soportar 'SYSTEM_MASTER'
  user: string;
  openingBalances: {
    currency: 'USD' | 'VES' | 'COP';
    amount: number;
  }[];
  declaredBalances: {
    currency: 'USD' | 'VES' | 'COP';
    method: string;
    amount: number;
    denominations?: Record<string, number>;
  }[];
  adjustments: {
    type: 'IN' | 'OUT';
    currency: 'USD' | 'VES' | 'COP';
    amount: number;
    reason: string;
    timestamp: Date;
  }[];
  status: 'Abierta' | 'Cerrada';
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
}

const CashSessionSchema: Schema = new Schema({
  // Usamos String en lugar de ObjectId para permitir identificadores virtuales como 'SYSTEM_MASTER'
  store: { type: String, required: true, index: true },
  user: { type: String, required: true },
  openingBalances: [{
    currency: { type: String, enum: ['USD', 'VES', 'COP'], required: true },
    amount: { type: Number, required: true }
  }],
  declaredBalances: [{
    currency: { type: String, enum: ['USD', 'VES', 'COP'] },
    method: { type: String },
    amount: { type: Number },
    denominations: { type: Map, of: Number }
  }],
  adjustments: [{
    type: { type: String, enum: ['IN', 'OUT'] },
    currency: { type: String, enum: ['USD', 'VES', 'COP'] },
    amount: { type: Number },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['Abierta', 'Cerrada'], default: 'Abierta' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  notes: { type: String },
}, { timestamps: true });

const CashSessionModel = mongoose.models.CashSession || mongoose.model<ICashSession>('CashSession', CashSessionSchema);
export default CashSessionModel;
