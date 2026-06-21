import mongoose, { Schema, Document } from 'mongoose';
import { IStore } from './Store';
import { IRole } from './Role';

export interface IUser extends Document {
  store?: IStore['_id'] | null; // Opcional para Super Admins
  name: string;
  email: string; // En este caso será 'javistech'
  password: string;
  role: IRole['_id'];
  active: boolean;
  isGlobalAdmin: boolean; // Flag para identificar al desarrollador/superadmin
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  active: { type: Boolean, default: true },
  isGlobalAdmin: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Índice único global por email/usuario
UserSchema.index({ email: 1 }, { unique: true });

const UserModel = (mongoose.models.User || mongoose.model<IUser>('User', UserSchema)) as mongoose.Model<IUser>;

export default UserModel;
