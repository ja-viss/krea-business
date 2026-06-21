import mongoose, { Schema, Document } from 'mongoose';
import { IStore } from './Store';

export interface IRole extends Document {
  store?: IStore['_id'] | null; // Opcional para roles globales del sistema
  name: string;
  permissions: string[];
  isSystemRole: boolean; // Flag para proteger roles maestros
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
  name: { type: String, required: true },
  permissions: [{ type: String }],
  isSystemRole: { type: Boolean, default: false },
}, {
  timestamps: true
});

const RoleModel = (mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema)) as mongoose.Model<IRole>;

export default RoleModel;
