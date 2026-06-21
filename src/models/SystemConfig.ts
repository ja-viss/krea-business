
import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  masterUser: string;
  masterKeyAlpha: string;
  masterKeyBeta: string;
}

const SystemConfigSchema: Schema = new Schema({
  // Eliminamos los defaults para forzar la configuración inicial por parte del usuario real
  masterUser: { type: String, required: true },
  masterKeyAlpha: { type: String, required: true },
  masterKeyBeta: { type: String, required: true },
}, { 
  timestamps: true 
});

const SystemConfigModel = (mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema)) as mongoose.Model<ISystemConfig>;

export default SystemConfigModel;
