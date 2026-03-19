import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranchInventory extends Document {
  tenantId: mongoose.Types.ObjectId;
  branch: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  stock: number;
  reservedStock: number;
  lastRestocked?: Date;
  lastSold?: Date;
  reorderPoint: number;
  maxStock: number;
  createdAt: Date;
  updatedAt: Date;
}

const BranchInventorySchema = new Schema<IBranchInventory>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  stock: { type: Number, default: 0 },
  reservedStock: { type: Number, default: 0 },
  lastRestocked: Date,
  lastSold: Date,
  reorderPoint: { type: Number, default: 10 },
  maxStock: { type: Number, default: 1000 }
}, { timestamps: true });

BranchInventorySchema.index({ tenantId: 1, branch: 1, product: 1 }, { unique: true });
BranchInventorySchema.index({ tenantId: 1, stock: 1 });

export default (mongoose.models.BranchInventory as Model<IBranchInventory>) || 
  mongoose.model<IBranchInventory>('BranchInventory', BranchInventorySchema);
