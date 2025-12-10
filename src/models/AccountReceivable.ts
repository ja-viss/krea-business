import mongoose, { Schema, Document } from 'mongoose';

export interface IAccountReceivable extends Document {
  customer: string;
  dueDate: Date;
  amount: number;
  status: 'Pendiente' | 'Atrasado' | 'Pagado';
  createdAt: Date;
  updatedAt: Date;
}

const AccountReceivableSchema: Schema = new Schema({
  customer: { type: String, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pendiente', 'Atrasado', 'Pagado'], required: true },
}, {
  timestamps: true
});

const AccountReceivableModel = (mongoose.models.AccountReceivable || mongoose.model<IAccountReceivable>('AccountReceivable', AccountReceivableSchema)) as mongoose.Model<IAccountReceivable>;

export default AccountReceivableModel;
