
import { Schema } from 'mongoose';

const LotSchema = new Schema({
    number: { type: String, required: true },
    expiryDate: { type: Date },
    quantity: { type: Number, required: true, default: 0 },
});

const ComponentSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String }, // Redundancia para velocidad
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
  baseUnit: { type: String, enum: ['Unidad', 'Kilogramos', 'Gramos', 'Litros'], default: 'Unidad' },
  isWeightable: { type: Boolean, default: false }, // Dispara el modal de peso en POS

  stock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true, min: 0 }, // Precio por unidad o por Kg
  taxRate: { type: Number, required: true, default: 0.16 },
  location: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
  
  // Receta para productos Compuestos (Combos)
  recipe: [ComponentSchema],
}, {
  timestamps: true
});

ProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ store: 1, barcode: 1 }, { unique: true, sparse: true });
