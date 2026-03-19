import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  expiryDate?: Date;
  image?: string;
  isActive: boolean;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  barcode: String,
  description: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  price: { type: Number, required: true },
  cost: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  expiryDate: Date,
  image: String,
  isActive: { type: Boolean, default: true },
  salesCount: { type: Number, default: 0 }
}, { timestamps: true });

ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, barcode: 1 });
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ tenantId: 1, stock: 1 });

export default (mongoose.models.Product as Model<IProduct>) || mongoose.model<IProduct>('Product', ProductSchema);
