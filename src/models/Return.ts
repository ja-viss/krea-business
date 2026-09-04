
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReturn extends Document {
  store: Types.ObjectId;
  sale: Types.ObjectId; // Factura original
  invoiceNumber: number;
  customerName: string;
  items: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    taxRate: number;
  }>;
  totalRefund: number;
  compensationMethod: 'Nota de Credito' | 'Reembolso' | 'Cambio';
  reason: string;
  status: 'Completado' | 'Anulado';
  authorizedBy: Types.ObjectId;
  createdAt: Date;
}

const ReturnSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  sale: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
  invoiceNumber: { type: Number, required: true },
  customerName: { type: String, required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    taxRate: { type: Number, required: true },
  }],
  totalRefund: { type: Number, required: true },
  compensationMethod: { type: String, enum: ['Nota de Credito', 'Reembolso', 'Cambio'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Completado', 'Anulado'], default: 'Completado' },
  authorizedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const ReturnModel = mongoose.models.Return || mongoose.model<IReturn>('Return', ReturnSchema);
export default ReturnModel;
