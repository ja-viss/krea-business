import mongoose, { Schema, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema = new Schema({
  name: { type: String, required: true },
  address: { type: String },
}, {
  timestamps: true
});

const StoreModel = (mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema)) as mongoose.Model<IStore>;

export default StoreModel;
