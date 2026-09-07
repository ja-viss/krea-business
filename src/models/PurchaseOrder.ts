
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPurchaseOrder extends Document {
  store: Types.ObjectId;
  orderNumber: number;
  lotReference?: string; // Referencia de Lote o Carga
  vendor: string;
  issuedDate: Date;
  expectedDeliveryDate: Date;
  receivedAt?: Date;
  status: 'Pendiente' | 'En camino' | 'Recibido' | 'Anulado';
  
  // Tracking Logístico
  logisticsStatus: 'Factory' | 'In Transit' | 'Delivered';
  providerCoords: {
    lat: number;
    lng: number;
  };
  destinationCoords: {
    lat: number;
    lng: number;
  };
  currentLocationCoords?: {
    lat: number;
    lng: number;
  };

  totalAmount: number;
  items: Array<{
    product: Types.ObjectId;
    name: string;
    quantity: number;
    cost: number;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  orderNumber: { type: Number, required: true },
  lotReference: { type: String }, // Identificador de lote
  vendor: { type: String, required: true },
  issuedDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date, required: true },
  receivedAt: { type: Date },
  status: { type: String, enum: ['Pendiente', 'En camino', 'Recibido', 'Anulado'], default: 'Pendiente' },
  
  // Logística Snapshotted
  logisticsStatus: { type: String, enum: ['Factory', 'In Transit', 'Delivered'], default: 'Factory' },
  providerCoords: {
    lat: { type: Number, required: true }, 
    lng: { type: Number, required: true }
  },
  destinationCoords: {
    lat: { type: Number, required: true }, 
    lng: { type: Number, required: true }
  },
  currentLocationCoords: {
    lat: { type: Number },
    lng: { type: Number }
  },

  totalAmount: { type: Number, required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    cost: { type: Number, required: true },
  }],
  notes: { type: String },
}, { timestamps: true });

PurchaseOrderSchema.index({ store: 1, orderNumber: 1 }, { unique: true });

export const POCounterModel = mongoose.models.POCounter || mongoose.model('POCounter', new Schema({
    storeId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
}));

const PurchaseOrderModel = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
export default PurchaseOrderModel;
