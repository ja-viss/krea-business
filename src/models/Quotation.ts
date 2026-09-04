
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';
import { ICustomer } from './Customer';

export interface IQuotation extends Document {
  store: Types.ObjectId | IStore;
  quotationNumber: number;
  customer?: Types.ObjectId | ICustomer;
  customerName: string;
  totalAmount: number;
  subtotals: {
    exempt: number;
    general: number;
    reduced: number;
  };
  taxDetails: {
    general: number;
    reduced: number;
  };
  items: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    taxRate: number;
  }>;
  status: 'Pendiente' | 'Convertida' | 'Vencida' | 'Rechazada';
  expiryDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  quotationNumber: { type: Number, required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  subtotals: {
    exempt: { type: Number, default: 0 },
    general: { type: Number, default: 0 },
    reduced: { type: Number, default: 0 },
  },
  taxDetails: {
    general: { type: Number, default: 0 },
    reduced: { type: Number, default: 0 },
  },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    taxRate: { type: Number, required: true },
  }],
  status: { type: String, enum: ['Pendiente', 'Convertida', 'Vencida', 'Rechazada'], default: 'Pendiente' },
  expiryDate: { type: Date, default: () => new Date(+new Date() + 7*24*60*60*1000) },
  notes: { type: String },
}, { timestamps: true });

QuotationSchema.index({ store: 1, quotationNumber: 1 }, { unique: true });

export const QuoteCounterModel = mongoose.models.QuoteCounter || mongoose.model('QuoteCounter', new Schema({
    storeId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
}));

const QuotationModel = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);
export default QuotationModel;
