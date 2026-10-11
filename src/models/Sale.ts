
import { Schema, model, models, Types, Document } from 'mongoose';

export interface ISaleItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  taxRate: number;
}

export interface IPayment {
    method: string;
    amount: number;
    currency: string;
    reference?: string;
    bank?: string;
    holderName?: string;
    phone?: string;
    batchNumber?: string;
    amountReceived?: number;
    changeGiven?: number;
}

export interface ISale extends Document {
  store: Types.ObjectId;
  cashSession?: Types.ObjectId;
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
  payments: IPayment[];
  status: 'Pagado' | 'Pendiente' | 'Atrasado' | 'Anulado';
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    taxRate: { type: Number, required: true },
});

const PaymentSchema = new Schema({
    method: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    reference: { type: String },
    bank: { type: String },
    holderName: { type: String },
    phone: { type: String },
    batchNumber: { type: String },
    amountReceived: { type: Number },
    changeGiven: { type: Number },
});

const SaleSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  cashSession: { type: Schema.Types.ObjectId, ref: 'CashSession' },
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
  payments: [PaymentSchema],
  status: { type: String, enum: ['Pagado', 'Pendiente', 'Atrasado', 'Anulado'], default: 'Pagado' },
}, { timestamps: true });

SaleSchema.index({ store: 1, invoiceNumber: 1 }, { unique: true });

export const SaleCounterV2Model = models.SaleCounterV2 || model('SaleCounterV2', new Schema({
    storeId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
}));

const SaleModel = models.Sale || model<ISale>('Sale', SaleSchema);
export default SaleModel;
