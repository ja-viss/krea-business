
import { Schema } from 'mongoose';

export const CashSessionSchema: Schema = new Schema({
  store: { type: String, required: true, index: true },
  user: { type: String, required: true },
  userName: { type: String, required: true },
  terminalName: { type: String, default: 'Caja Principal' },
  closureMode: { type: String, enum: ['blind', 'manual', 'fiscal'], default: 'blind' },
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
}, { timestamps: true });
