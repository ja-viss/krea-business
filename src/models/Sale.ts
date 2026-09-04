
import { Schema, model, models, Types, Document } from 'mongoose';

export interface ISaleItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  taxRate: number;
}

export interface ISale extends Document {
  store: Types.ObjectId;
  invoiceNumber: number;
  customer?: Types.ObjectId;
  customerName: string;
  subtotals: {
    exempt: number;
    general: number;
    reduced: number;
  };
  taxDetails: {
    general: number;
    reduced: number;
  };
  totalAmount: number;
  items: ISaleItem[];
  paymentMethod: string;
  paymentReference?: string;
  paymentCurrency?: string;
  status: 'Pagado' | 'Pendiente' | 'Atrasado' | 'Anulado';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalePopulated extends Omit<ISale, 'customer'> {
    customer?: { idNumber: string; name: string };
}

const SaleItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    taxRate: { type: Number, required: true },
});

const SaleSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  invoiceNumber: { type: Number, required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  subtotals: {
    exempt: { type: Number, default: 0 },
    general: { type: Number, default: 0 },
    reduced: { type: Number, default: 0 },
  },
  taxDetails: {
    general: { type: Number, default: 0 },
    reduced: { type: Number, default: 0 },
  },
  totalAmount: { type: Number, required: true },
  items: [SaleItemSchema],
  paymentMethod: { type: String, required: true },
  paymentReference: { type: String },
  paymentCurrency: { type: String },
  status: { type: String, enum: ['Pagado', 'Pendiente', 'Atrasado', 'Anulado'], default: 'Pagado' },
}, { timestamps: true });

SaleSchema.index({ store: 1, invoiceNumber: 1 }, { unique: true });

export const SaleCounterV2Model = models.SaleCounterV2 || model('SaleCounterV2', new Schema({
    storeId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
}));

const SaleModel = models.Sale || model<ISale>('Sale', SaleSchema);
export default SaleModel;
