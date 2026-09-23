
import { Schema } from 'mongoose';

export const CustomerSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  idNumber: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
}, {
  timestamps: true
});

CustomerSchema.index({ store: 1, idNumber: 1 }, { unique: true });
