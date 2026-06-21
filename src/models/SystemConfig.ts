
import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  masterUser: string;
  masterKeyAlpha: string;
  masterKeyBeta: string;
}

const SystemConfigSchema: Schema = new Schema({
  masterUser: { type: String, default: 'javistech' },
  masterKeyAlpha: { type: String, default: 'krea2026' },
  masterKeyBeta: { type: String, default: 'adminmaster' },
}, { 
  timestamps: true 
});

const SystemConfigModel = (mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema)) as mongoose.Model<ISystemConfig>;

export default SystemConfigModel;
