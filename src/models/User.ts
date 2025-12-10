import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  businessName: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  businessName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Admin' }, // Añadido campo de rol
}, {
  timestamps: true
});

const UserModel = (mongoose.models.User || mongoose.model<IUser>('User', UserSchema)) as mongoose.Model<IUser>;

export default UserModel;
