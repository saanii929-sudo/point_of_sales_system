import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplier extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  contactPerson: String,
  email: String,
  phone: String,
  address: String,
  website: String,
  notes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

SupplierSchema.index({ tenantId: 1, name: 1 });

export default (mongoose.models.Supplier as Model<ISupplier>) || mongoose.model<ISupplier>('Supplier', SupplierSchema);
