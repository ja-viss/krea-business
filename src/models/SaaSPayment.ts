
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface ISaaSPayment extends Document {
  store: Types.ObjectId | IStore;
  amount: number;
  currency: 'USD' | 'VES';
  paymentMethod: string;
  reference: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  notes?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaaSPaymentSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'VES'], default: 'USD' },
  paymentMethod: { type: String, required: true },
  reference: { type: String, required: true },
  status: { type: String, enum: ['Pendiente', 'Aprobado', 'Rechazado'], default: 'Pendiente' },
  notes: { type: String },
  processedAt: { type: Date },
}, {
  timestamps: true
});

const SaaSPaymentModel = (mongoose.models.SaaSPayment || mongoose.model<ISaaSPayment>('SaaSPayment', SaaSPaymentSchema)) as mongoose.Model<ISaaSPayment>;

export default SaaSPaymentModel;
