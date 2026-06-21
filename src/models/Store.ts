import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  rif?: string;
  address: string;
  phone?: string;
  email?: string;
  seniatCondition?: string;
  footerMessage?: string;
  // SaaS Control Fields
  status: 'Active' | 'Suspended' | 'Demo' | 'Expired';
  plan: 'Basic' | 'Pro' | 'Premium';
  expiryDate: Date;
  maxUsers: number;
  maxInvoicesPerMonth: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema = new Schema({
  name: { type: String, required: true },
  rif: { type: String },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  seniatCondition: { type: String, default: 'Contribuyente Ordinario del IVA' },
  footerMessage: { type: String, default: 'Gracias por su compra' },
  // Default SaaS values
  status: { type: String, enum: ['Active', 'Suspended', 'Demo', 'Expired'], default: 'Demo' },
  plan: { type: String, enum: ['Basic', 'Pro', 'Premium'], default: 'Basic' },
  expiryDate: { type: Date, default: () => new Date(+new Date() + 15*24*60*60*1000) }, // 15 days demo by default
  maxUsers: { type: Number, default: 3 },
  maxInvoicesPerMonth: { type: Number, default: 100 },
}, {
  timestamps: true
});

const StoreModel = (mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema)) as mongoose.Model<IStore>;

export default StoreModel;
