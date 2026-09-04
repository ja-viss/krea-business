
import { Schema } from 'mongoose';

export const ProductSchema = new Schema({
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
  taxRate: { type: Number, required: true, default: 0.16 },
  location: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
ProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ store: 1, barcode: 1 }, { unique: true, sparse: true });
