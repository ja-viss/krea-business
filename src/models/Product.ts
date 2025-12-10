import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  stock: number;
  price: number;
  status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
}, {
  timestamps: true
});

const ProductModel = (mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)) as mongoose.Model<IProduct>;

export default ProductModel;
