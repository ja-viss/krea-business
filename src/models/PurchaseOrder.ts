
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPurchaseOrder extends Document {
  store: Types.ObjectId;
  orderNumber: number;
  vendor: string;
  issuedDate: Date;
  expectedDeliveryDate: Date;
  receivedAt?: Date;
  status: 'Pendiente' | 'En camino' | 'Recibido' | 'Anulado';
  totalAmount: number;
  items: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    cost: number;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  orderNumber: { type: Number, required: true },
  vendor: { type: String, required: true },
  issuedDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date, required: true },
  receivedAt: { type: Date },
  status: { type: String, enum: ['Pendiente', 'En camino', 'Recibido', 'Anulado'], default: 'Pendiente' },
  totalAmount: { type: Number, required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    cost: { type: Number, required: true },
  }],
  notes: { type: String },
}, { timestamps: true });

PurchaseOrderSchema.index({ store: 1, orderNumber: 1 }, { unique: true });

export const POCounterModel = mongoose.models.POCounter || mongoose.model('POCounter', new Schema({
    storeId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
}));

const PurchaseOrderModel = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
export default PurchaseOrderModel;
