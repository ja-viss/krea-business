
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface ICustomer extends Document {
  _id: string; // To ensure _id is typed as string
  store: Types.ObjectId | IStore;
  idNumber: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  idNumber: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
}, {
  timestamps: true
});

// Ensure idNumber is unique per store
CustomerSchema.index({ store: 1, idNumber: 1 }, { unique: true });

const CustomerModel = (mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)) as mongoose.Model<ICustomer>;

export default CustomerModel;

    