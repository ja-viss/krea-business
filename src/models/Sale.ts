import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface ISale extends Document {
  store: Types.ObjectId | IStore;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'Pagado' | 'Pendiente' | 'Atrasado';
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pagado', 'Pendiente', 'Atrasado'], required: true },
}, {
  timestamps: true
});

const SaleModel = (mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)) as mongoose.Model<ISale>;

export default SaleModel;
