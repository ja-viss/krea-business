
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStore } from './Store';

export interface INewProduct extends Document {
  store: Types.ObjectId | IStore;
  name: string;
  productType: 'Inventariable' | 'No Inventariable' | 'Servicio';
  barcode?: string;
  sku?: string;
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

const NewProductSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, required: true },
  productType: { type: String, enum: ['Inventariable', 'No Inventariable', 'Servicio'], required: true },
  barcode: { type: String, sparse: true, unique: true },
  sku: { type: String, sparse: true, unique: true },
  category: { type: String },
  stock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  location: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
}, {
  timestamps: true
});

// Índice compuesto para asegurar que barcode y sku sean únicos por tienda
NewProductSchema.index({ store: 1, barcode: 1 }, { unique: true, sparse: true });
NewProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });

const NewProductModel = (mongoose.models.NewProduct || mongoose.model<INewProduct>('NewProduct', NewProductSchema)) as mongoose.Model<INewProduct>;

export default NewProductModel;
