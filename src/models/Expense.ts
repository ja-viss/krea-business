import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface IExpense extends Document {
  store: Types.ObjectId | IStore;
  category: string;
  description: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
}, {
  timestamps: true
});

const ExpenseModel = (mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)) as mongoose.Model<IExpense>;

export default ExpenseModel;
