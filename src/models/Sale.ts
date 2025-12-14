
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';
import { ICustomer } from './Customer';
import { IProduct } from './Product';

interface ISaleItem {
  product: Types.ObjectId | IProduct;
  name: string;
  quantity: number;
  price: number; // Price in VES at the time of sale
  taxRate: number; // Tax rate at the time of sale
}

export interface ISale extends Document {
  store: Types.ObjectId | IStore;
  invoiceNumber: number;
  customer?: Types.ObjectId | ICustomer;
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
  totalAmount: number; // Monto total (subtotal + iva) en VES
  items: ISaleItem[];
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Pago Móvil';
  paymentReference?: string;
  status: 'Pagado' | 'Pendiente' | 'Atrasado' | 'Anulado';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalePopulated extends Omit<ISale, 'customer'> {
    customer?: ICustomer;
}

// Counter for invoice numbers
const SaleCounterSchema = new Schema({
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    seq: { type: Number, default: 0 }
});
SaleCounterSchema.index({ store: 1 }, { unique: true });
export const SaleCounterModel = (mongoose.models.SaleCounter || mongoose.model('SaleCounter', SaleCounterSchema));


const SaleItemSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    taxRate: { type: Number, required: true },
});

const SaleSchema: Schema = new Schema({
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
  paymentMethod: { type: String, enum: ['Efectivo', 'Tarjeta', 'Transferencia', 'Pago Móvil'], required: true },
  paymentReference: { type: String },
  status: { type: String, enum: ['Pagado', 'Pendiente', 'Atrasado', 'Anulado'], required: true, default: 'Pagado' },
}, {
  timestamps: true
});

// Ensure that the combination of store and invoiceNumber is unique.
SaleSchema.index({ store: 1, invoiceNumber: 1 }, { unique: true });


const SaleModel = (mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)) as mongoose.Model<ISale>;

export default SaleModel;
