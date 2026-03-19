import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  manager?: mongoose.Types.ObjectId;
  isActive: boolean;
  settings: {
    allowNegativeStock: boolean;
    autoReorder: boolean;
    reorderThreshold: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  manager: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  settings: {
    allowNegativeStock: { type: Boolean, default: false },
    autoReorder: { type: Boolean, default: false },
    reorderThreshold: { type: Number, default: 10 }
  }
}, { timestamps: true });

BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
BranchSchema.index({ tenantId: 1, isActive: 1 });

export default (mongoose.models.Branch as Model<IBranch>) || mongoose.model<IBranch>('Branch', BranchSchema);
