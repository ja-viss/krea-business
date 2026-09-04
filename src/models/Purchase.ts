
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPurchase extends Document {
  store: Types.ObjectId;
  vendor: string; // O Referencia a modelo Vendor
  documentNumber: string;
  totalAmount: number;
  items: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    cost: number;
    lot?: string;
    expiryDate?: Date;
  }>;
  status: 'Recibido' | 'Pendiente' | 'Anulado';
  createdAt: Date;
}

const PurchaseSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  vendor: { type: String, required: true },
  documentNumber: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    cost: { type: Number, required: true },
    lot: { type: String },
    expiryDate: { type: Date },
  }],
  status: { type: String, enum: ['Recibido', 'Pendiente', 'Anulado'], default: 'Recibido' },
}, { timestamps: true });

const PurchaseModel = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
export default PurchaseModel;
