
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICreditNote extends Document {
  store: Types.ObjectId;
  customer: Types.ObjectId;
  customerName: string;
  amount: number;
  remainingAmount: number;
  code: string; // Código para usar en el POS
  status: 'Disponible' | 'Usado' | 'Vencido';
  expiryDate: Date;
  createdAt: Date;
}

const CreditNoteSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  amount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Disponible', 'Usado', 'Vencido'], default: 'Disponible' },
  expiryDate: { type: Date, required: true },
}, { timestamps: true });

CreditNoteSchema.index({ store: 1, code: 1 }, { unique: true });

const CreditNoteModel = mongoose.models.CreditNote || mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);
export default CreditNoteModel;
