
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';
import { ICustomer } from './Customer';
import { IProduct } from './Product';
import { SaleSchema } from './schemas/SaleSchema';

export { SaleSchema };

interface ISaleItem {
  product: Types.ObjectId | IProduct;
  name: string;
  quantity: number;
  price: number; 
  taxRate: number; 
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
  totalAmount: number;
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

const SaleCounterV2Schema = new Schema({
    storeId: { type: String, required: true },
    seq: { type: Number, default: 0 }
}, { strict: false });

SaleCounterV2Schema.index({ storeId: 1 }, { unique: true });
export const SaleCounterV2Model = (mongoose.models.SaleCounterV2 || mongoose.model('SaleCounterV2', SaleCounterV2Schema));

const SaleModel = (mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)) as mongoose.Model<ISale>;

export default SaleModel;
