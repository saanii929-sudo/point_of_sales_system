import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  lifetimeValue: number;
  visitCount: number;
  lastVisit?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  address: String,
  totalPurchases: { type: Number, default: 0 },
  lifetimeValue: { type: Number, default: 0 },
  visitCount: { type: Number, default: 0 },
  lastVisit: Date
}, { timestamps: true });

CustomerSchema.index({ tenantId: 1, phone: 1 });
CustomerSchema.index({ tenantId: 1, email: 1 });

export default (mongoose.models.Customer as Model<ICustomer>) || mongoose.model<ICustomer>('Customer', CustomerSchema);
