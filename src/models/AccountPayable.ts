import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface IAccountPayable extends Document {
  store: Types.ObjectId | IStore;
  vendor: string;
  dueDate: Date;
  amount: number;
  status: 'Pendiente' | 'Pagado';
  createdAt: Date;
  updatedAt: Date;
}

const AccountPayableSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  vendor: { type: String, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pendiente', 'Pagado'], required: true },
}, {
  timestamps: true
});

const AccountPayableModel = (mongoose.models.AccountPayable || mongoose.model<IAccountPayable>('AccountPayable', AccountPayableSchema)) as mongoose.Model<IAccountPayable>;

export default AccountPayableModel;
