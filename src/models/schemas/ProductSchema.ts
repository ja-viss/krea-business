
import { Schema } from 'mongoose';

export const ProductSchema = new Schema({
  name: { type: String, required: true },
  productType: { type: String, enum: ['Inventariable', 'No Inventariable', 'Servicio'], required: true },
  barcode: { type: String },
  sku: { type: String },
  stock: { type: Number, default: 0 },
  price: { type: Number, required: true },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
}, { timestamps: true });
