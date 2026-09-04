
import { Schema } from 'mongoose';

const LotSchema = new Schema({
    number: { type: String, required: true },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, default: 0 },
});

const ComponentSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
});

export const ProductSchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  name: { type: String, required: true },
  productType: { type: String, enum: ['Inventariable', 'No Inventariable', 'Servicio', 'Compuesto'], required: true },
  barcode: { type: String },
  sku: { type: String },
  brand: { type: String },
  vendor: { type: String },
  category: { type: String },
  
  // Gestión de Unidades
  baseUnit: { type: String, default: 'Unidad' }, // Unidades, Kg, Litros, etc.
  purchaseUnit: { type: String }, // Bulto, Caja, Saco
  conversionFactor: { type: Number, default: 1 }, // Ej: 24 (unidades por bulto)

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
  recipe: [ComponentSchema], // Solo para tipo 'Compuesto'
  isWeightable: { type: Boolean, default: false }, // Dispara lectura de balanza
  isBimonetary: { type: Boolean, default: true },
  allowCredit: { type: Boolean, default: true },
}, {
  timestamps: true
});

ProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ store: 1, barcode: 1 }, { unique: true, sparse: true });
