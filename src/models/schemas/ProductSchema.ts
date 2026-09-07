
import { Schema } from 'mongoose';

const ComponentSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
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
  
  // Gestión de Unidades y Pesaje
  baseUnit: { type: String, enum: ['Unidad', 'Kilogramos', 'Gramos', 'Litros', 'Mililitros'], default: 'Unidad' },
  isWeightable: { type: Boolean, default: false },

  // Control de Vencimiento
  expiryDate: { type: Date },

  stock: { type: Number, required: true, default: 0 },
  inTransit: { type: Number, default: 0 }, // NUEVO: Stock comprometido que viene de proveedores
  minStock: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true, min: 0 }, 
  taxRate: { type: Number, required: true, default: 0.16 },
  location: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['En Stock', 'Stock Bajo', 'Sin Stock'], required: true },
  
  recipe: [ComponentSchema],
}, {
  timestamps: true
});

ProductSchema.index({ store: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ store: 1, barcode: 1 }, { unique: true, sparse: true });
