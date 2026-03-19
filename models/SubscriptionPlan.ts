import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  displayName: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxEmployees: number;
    maxBranches: number;
    maxProducts: number;
    hasAnalytics: boolean;
    hasReports: boolean;
    hasMultiBranch: boolean;
    hasAPI: boolean;
    supportLevel: 'basic' | 'priority' | 'dedicated';
  };
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  name: { type: String, required: true, unique: true }, // e.g., 'starter', 'professional', 'enterprise'
  displayName: { type: String, required: true }, // e.g., 'Starter Plan', 'Professional Plan'
  description: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  billingCycle: { 
    type: String, 
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  features: [{ type: String }],
  limits: {
    maxEmployees: { type: Number, default: 5 },
    maxBranches: { type: Number, default: 1 },
    maxProducts: { type: Number, default: 100 },
    hasAnalytics: { type: Boolean, default: false },
    hasReports: { type: Boolean, default: false },
    hasMultiBranch: { type: Boolean, default: false },
    hasAPI: { type: Boolean, default: false },
    supportLevel: { 
      type: String, 
      enum: ['basic', 'priority', 'dedicated'],
      default: 'basic'
    }
  },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

SubscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

export default (mongoose.models.SubscriptionPlan as Model<ISubscriptionPlan>) || 
  mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
