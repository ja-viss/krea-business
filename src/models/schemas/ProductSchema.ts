
import { Schema } from 'mongoose';

const LotSchema = new Schema({
    number: { type: String, required: true },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, default: 0 },
});

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
  // Campos Avanzados
  lots: [LotSchema],
  isBimonetary: { type: Boolean, default: true },
  allowCredit: { type: Boolean, default: true },
}, {
  timestamps: true
});

ProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ store: 1, barcode: 1 }, { unique: true, sparse: true });
