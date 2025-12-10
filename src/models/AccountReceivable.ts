import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface IAccountReceivable extends Document {
  store: Types.ObjectId | IStore;
  customer: string;
  dueDate: Date;
  amount: number;
  status: 'Pendiente' | 'Atrasado' | 'Pagado';
  createdAt: Date;
  updatedAt: Date;
}

const AccountReceivableSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customer: { type: String, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pendiente', 'Atrasado', 'Pagado'], required: true },
}, {
  timestamps: true
});

const AccountReceivableModel = (mongoose.models.AccountReceivable || mongoose.model<IAccountReceivable>('AccountReceivable', AccountReceivableSchema)) as mongoose.Model<IAccountReceivable>;

export default AccountReceivableModel;
