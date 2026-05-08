import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  rif?: string;
  address: string;
  phone?: string;
  email?: string;
  seniatCondition?: string;
  footerMessage?: string;
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
}, {
  timestamps: true
});

const StoreModel = (mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema)) as mongoose.Model<IStore>;

export default StoreModel;
