
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';
import { ICustomer } from './Customer';
import { IProduct } from './Product';

interface ISaleItem {
  product: Types.ObjectId | IProduct;
  name: string;
  quantity: number;
  price: number; // Price at the time of sale
}

export interface ISale extends Document {
  store: Types.ObjectId | IStore;
  customer?: Types.ObjectId | ICustomer;
  customerName: string;
  customerEmail: string; // Kept for simplicity in recent-sales lists
  amount: number; // Subtotal (Base Imponible) en VES
  taxAmount: number; // Monto del IVA en VES
  totalAmount: number; // Monto total (subtotal + iva) en VES
  items: ISaleItem[];
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Pago Móvil';
  status: 'Pagado' | 'Pendiente' | 'Atrasado' | 'Anulado';
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
});

const SaleSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true, default: 'n/a' },
  amount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  items: [SaleItemSchema],
  paymentMethod: { type: String, enum: ['Efectivo', 'Tarjeta', 'Transferencia', 'Pago Móvil'], required: true },
  status: { type: String, enum: ['Pagado', 'Pendiente', 'Atrasado', 'Anulado'], required: true, default: 'Pagado' },
}, {
  timestamps: true
});

const SaleModel = (mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)) as mongoose.Model<ISale>;

export default SaleModel;

    