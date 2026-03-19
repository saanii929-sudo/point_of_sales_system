import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: mongoose.Types.ObjectId;
  details?: any;
  ipAddress?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: Schema.Types.ObjectId,
  details: Schema.Types.Mixed,
  ipAddress: String
}, { timestamps: true });

ActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
ActivityLogSchema.index({ tenantId: 1, user: 1 });

export default (mongoose.models.ActivityLog as Model<IActivityLog>) || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
