import mongoose, { Schema, Document } from 'mongoose';
import { IStore } from './Store';
import { IRole } from './Role';

export interface IUser extends Document {
  store: IStore['_id'];
  name: string;
  email: string;
  password: string;
  role: IRole['_id'];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  active: { type: Boolean, default: true },
}, {
  timestamps: true
});

// Para asegurar que un email sea único por tienda
UserSchema.index({ email: 1, store: 1 }, { unique: true });

// Forzar la recompilación del modelo para evitar errores de HMR en desarrollo
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;
