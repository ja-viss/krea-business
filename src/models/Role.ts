import mongoose, { Schema, Document } from 'mongoose';
import { IStore } from './Store';

export interface IRole extends Document {
  store: IStore['_id'];
  name: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema({
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  permissions: [{ type: String }],
}, {
  timestamps: true
});

const RoleModel = (mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema)) as mongoose.Model<IRole>;

export default RoleModel;
