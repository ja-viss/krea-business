
import mongoose, { Document, Types } from 'mongoose';
import { IStore } from './Store';
import { ProductSchema } from './schemas/ProductSchema';

export { ProductSchema };

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
  taxRate: number;
  location?: string;
  imageUrl?: string;
  status: 'En Stock' | 'Stock Bajo' | 'Sin Stock';
  createdAt: Date;
  updatedAt: Date;
}

const ProductModel = (mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)) as mongoose.Model<IProduct>;

export default ProductModel;
