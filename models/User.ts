import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'business_owner' | 'manager' | 'cashier' | 'inventory_staff';
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: false },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'business_owner', 'manager', 'cashier', 'inventory_staff'],
    default: 'cashier'
  },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

UserSchema.index({ tenantId: 1, email: 1 });
UserSchema.index({ tenantId: 1, role: 1 });

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
