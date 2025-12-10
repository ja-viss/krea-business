import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface IProduct extends Document {
  store: Types.ObjectId | IStore;
  name: string;
  stock: number;
  price: number;
  status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
}, {
  timestamps: true
});

const ProductModel = (mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)) as mongoose.Model<IProduct>;

export default ProductModel;
