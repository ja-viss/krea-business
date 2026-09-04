
import mongoose, { Document, Types } from 'mongoose';
import { IStore } from './Store';
import { ExpenseSchema } from './schemas/ExpenseSchema';

export { ExpenseSchema };

export interface IExpense extends Document {
  store: Types.ObjectId | IStore;
  category: string;
  description: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseModel = (mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)) as mongoose.Model<IExpense>;

export default ExpenseModel;
