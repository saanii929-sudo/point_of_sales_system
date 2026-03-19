import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReturn extends Document {
  tenantId: mongoose.Types.ObjectId;
  returnNumber: string;
  saleId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  items: {
    productId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  reason: string;
  refundMethod: 'cash' | 'card' | 'store_credit';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  processedBy?: mongoose.Types.ObjectId;
  processedDate?: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnSchema = new Schema<IReturn>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  returnNumber: { type: String, required: true },
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  reason: { type: String, required: true },
  refundMethod: { type: String, enum: ['cash', 'card', 'store_credit'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  processedDate: Date,
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ReturnSchema.index({ tenantId: 1, returnNumber: 1 }, { unique: true });
ReturnSchema.index({ tenantId: 1, status: 1 });
ReturnSchema.index({ tenantId: 1, createdAt: -1 });

export default (mongoose.models.Return as Model<IReturn>) || mongoose.model<IReturn>('Return', ReturnSchema);
