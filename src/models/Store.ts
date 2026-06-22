
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
  // Hybrid Security Fields
  deploymentMode: 'Online' | 'Offline';
  offlineHardwareId?: string; // ID único de la máquina local
  activationToken?: string;   // Token firmado para el handshake
  secretKey?: string;         // Llave única de cifrado local
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
  // Hybrid Config
  deploymentMode: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
  offlineHardwareId: { type: String },
  activationToken: { type: String },
  secretKey: { type: String },
  // URI Cifrada de DB
  tenantDbUri: { type: String },
}, {
  timestamps: true
});

const StoreModel = (mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema)) as mongoose.Model<IStore>;

export default StoreModel;
