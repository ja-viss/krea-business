
import mongoose, { Schema, Document } from 'mongoose';

export interface ICashSession extends Document {
  store: string;
  user: string;
  userName: string;
  openingBalances: {
    currency: 'USD' | 'VES' | 'COP';
    amount: number;
  }[];
  declaredBalances: {
    currency: 'USD' | 'VES' | 'COP';
    method: string;
    amount: number;
    denominations?: Record<string, number>;
    batchNumber?: string;
  }[];
  theoreticalBalances: {
    currency: 'USD' | 'VES' | 'COP';
    method: string;
    amount: number;
  }[];
  discrepancies: {
    currency: 'USD' | 'VES' | 'COP';
    method: string;
    difference: number;
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
  authorizedBy?: string;
}

const CashSessionSchema: Schema = new Schema({
  store: { type: String, required: true, index: true },
  user: { type: String, required: true },
  userName: { type: String, required: true },
  openingBalances: [{
    currency: { type: String, enum: ['USD', 'VES', 'COP'], required: true },
    amount: { type: Number, required: true }
  }],
  declaredBalances: [{
    currency: { type: String, enum: ['USD', 'VES', 'COP'] },
    method: { type: String },
    amount: { type: Number },
    batchNumber: { type: String },
    denominations: { type: Map, of: Number }
  }],
  theoreticalBalances: [{
    currency: { type: String, enum: ['USD', 'VES', 'COP'] },
    method: { type: String },
    amount: { type: Number }
  }],
  discrepancies: [{
    currency: { type: String, enum: ['USD', 'VES', 'COP'] },
    method: { type: String },
    difference: { type: Number }
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
  authorizedBy: { type: String },
}, { timestamps: true });

const CashSessionModel = mongoose.models.CashSession || mongoose.model<ICashSession>('CashSession', CashSessionSchema);
export default CashSessionModel;
