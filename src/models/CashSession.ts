
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICashSession extends Document {
  store: Types.ObjectId;
  user: Types.ObjectId;
  // Fondos iniciales desglosados
  openingBalances: {
    currency: 'USD' | 'VES' | 'COP';
    amount: number;
  }[];
  // Registro de lo contado físicamente (Arqueo)
  declaredBalances: {
    currency: 'USD' | 'VES' | 'COP';
    method: string; // 'Efectivo', 'Punto', 'Pago Movil', 'Zelle', etc.
    amount: number;
    denominations?: Record<string, number>; // Ej: { "20": 5, "10": 2 }
  }[];
  // Salidas manuales (Vales/Egresos)
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
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
