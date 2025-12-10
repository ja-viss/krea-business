import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'Pagado' | 'Pendiente' | 'Atrasado';
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema: Schema = new Schema({
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pagado', 'Pendiente', 'Atrasado'], required: true },
}, {
  timestamps: true
});

const SaleModel = (mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)) as mongoose.Model<ISale>;

export default SaleModel;
