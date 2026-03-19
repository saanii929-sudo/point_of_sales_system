import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#3B82F6' },
  icon: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

CategorySchema.index({ tenantId: 1, name: 1 });

export default (mongoose.models.Category as Model<ICategory>) || mongoose.model<ICategory>('Category', CategorySchema);
