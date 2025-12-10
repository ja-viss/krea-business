import mongoose, { Schema, Document } from 'mongoose';

export interface IAccountPayable extends Document {
  vendor: string;
  dueDate: Date;
  amount: number;
  status: 'Pendiente' | 'Pagado';
  createdAt: Date;
  updatedAt: Date;
}

const AccountPayableSchema: Schema = new Schema({
  vendor: { type: String, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pendiente', 'Pagado'], required: true },
}, {
  timestamps: true
});

const AccountPayableModel = (mongoose.models.AccountPayable || mongoose.model<IAccountPayable>('AccountPayable', AccountPayableSchema)) as mongoose.Model<IAccountPayable>;

export default AccountPayableModel;
