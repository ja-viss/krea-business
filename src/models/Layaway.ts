
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILayawayPayment {
  paymentId: string;
  date: Date;
  method: string;
  amountOriginal: number;
  currencyOriginal: 'USD' | 'VES' | 'COP';
  exchangeRate: number;
  amountUsd: number;
  cashierId: string;
}

export interface ILayaway extends Document {
  store: Types.ObjectId;
  code: string;
  type: 'LAYAWAY' | 'CREDIT';
  customer: {
    customerId?: Types.ObjectId;
    name: string;
    idNumber: string;
    phone: string;
  };
  items: Array<{
    productId: Types.ObjectId;
    name: string;
    quantity: number;
    unitPriceUsd: number;
    totalUsd: number;
    taxRate: number;
  }>;
  financials: {
    currencyBase: 'USD';
    totalAmountUsd: number;
    paidAmountUsd: number;
    remainingBalanceUsd: number;
  };
  dates: {
    createdAt: Date;
    expirationDate: Date;
    deliveredAt?: Date;
  };
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  payments: ILayawayPayment[];
  notes?: string;
}

export const LayawaySchema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['LAYAWAY', 'CREDIT'], default: 'LAYAWAY' },
  customer: {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    name: { type: String, required: true },
    idNumber: { type: String, required: true },
    phone: { type: String, required: true }
  },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPriceUsd: { type: Number, required: true },
    totalUsd: { type: Number, required: true },
    taxRate: { type: Number, default: 0.16 }
  }],
  financials: {
    currencyBase: { type: String, default: 'USD' },
    totalAmountUsd: { type: Number, required: true },
    paidAmountUsd: { type: Number, default: 0 },
    remainingBalanceUsd: { type: Number, required: true }
  },
  dates: {
    createdAt: { type: Date, default: Date.now },
    expirationDate: { type: Date, required: true },
    deliveredAt: { type: Date }
  },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  payments: [{
    paymentId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, required: true },
    amountOriginal: { type: Number, required: true },
    currencyOriginal: { type: String, enum: ['USD', 'VES', 'COP'], required: true },
    exchangeRate: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    cashierId: { type: String, required: true }
  }],
  notes: { type: String }
}, { timestamps: true });

LayawaySchema.index({ store: 1, code: 1 }, { unique: true });
LayawaySchema.index({ status: 1 });

export const LayawayCounterModel = mongoose.models.LayawayCounter || mongoose.model('LayawayCounter', new Schema({
    storeId: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
}));

const LayawayModel = mongoose.models.Layaway || mongoose.model<ILayaway>('Layaway', LayawaySchema);
export default LayawayModel;
