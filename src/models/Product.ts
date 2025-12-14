
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface IProduct extends Document {
  store: Types.ObjectId | IStore;
  name: string;
  productType: 'Inventariable' | 'No Inventariable' | 'Servicio';
  barcode?: string;
  sku?: string;
  brand?: string;
  vendor?: string;
  category?: string;
  stock: number;
  minStock: number;
  cost: number;
  price: number;
  location?: string;
  imageUrl?: string;
  status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, required: true },
  productType: { type: String, enum: ['Inventariable', 'No Inventariable', 'Servicio'], required: true },
  barcode: { type: String },
  sku: { type: String },
  brand: { type: String },
  vendor: { type: String },
  category: { type: String },
  stock: { type: Number, required: true, default: 0, min: 0 },
  minStock: { type: Number, required: true, default: 0, min: 0 },
  cost: { type: Number, required: true, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0 },
  location: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
}, {
  timestamps: true
});

// Índice compuesto para asegurar que barcode y sku sean únicos por tienda, si existen.
ProductSchema.index({ store: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $exists: true, $ne: "" } } });
ProductSchema.index({ store: 1, barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $exists: true, $ne: "" } } });


const ProductModel = (mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)) as mongoose.Model<IProduct>;

export default ProductModel;
