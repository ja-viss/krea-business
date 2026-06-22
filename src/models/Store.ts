
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
  storageLimitMB: number;
  // Feature Flags (Módulos Modulares)
  enabledModules: {
    inventory: boolean;
    sales: boolean;
    expenses: boolean;
    reports: boolean;
  };
  // Hybrid Security Fields
  deploymentMode: 'Online' | 'Offline';
  offlineHardwareId?: string;
  activationToken?: string;
  secretKey?: string;
  // Multi-Tenant Infrastructure (Encrypted)
  tenantDbUri?: string;
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
  status: { type: String, enum: ['Active', 'Suspended', 'Demo', 'Expired'], default: 'Demo' },
  plan: { type: String, enum: ['Basic', 'Pro', 'Premium'], default: 'Basic' },
  expiryDate: { type: Date, default: () => new Date(+new Date() + 15*24*60*60*1000) },
  maxUsers: { type: Number, default: 3 },
  maxInvoicesPerMonth: { type: Number, default: 500 },
  storageLimitMB: { type: Number, default: 500 },
  // Flags iniciales por defecto
  enabledModules: {
    inventory: { type: Boolean, default: true },
    sales: { type: Boolean, default: true },
    expenses: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
  },
  deploymentMode: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
  offlineHardwareId: { type: String },
  activationToken: { type: String },
  secretKey: { type: String },
  tenantDbUri: { type: String },
}, {
  timestamps: true
});

const StoreModel = (mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema)) as mongoose.Model<IStore>;

export default StoreModel;
