
import { Schema } from 'mongoose';

const SaleItemSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    taxRate: { type: Number, required: true },
});

export const SaleSchema: Schema = new Schema({
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

SaleSchema.index({ store: 1, invoiceNumber: 1 }, { unique: true });
