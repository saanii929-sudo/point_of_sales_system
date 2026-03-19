import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBusiness extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    companyTagline?: string;
  };
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired';
  subscriptionExpiry: Date;
  settings: {
    currency: string;
    taxRate: number;
    timezone: string;
  };
  limits: {
    maxEmployees: number;
    maxBranches: number;
    hasAnalytics: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  logo: String,
  branding: {
    primaryColor: { type: String, default: '#10b981' }, // green-500
    secondaryColor: { type: String, default: '#059669' }, // emerald-600
    accentColor: { type: String, default: '#34d399' }, // green-400
    logoUrl: String,
    faviconUrl: String,
    companyTagline: String
  },
  subscriptionPlan: { 
    type: String, 
    required: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'expired'],
    default: 'trial'
  },
  subscriptionExpiry: { type: Date, required: true },
  settings: {
    currency: { type: String, default: 'USD' },
    taxRate: { type: Number, default: 0 },
    timezone: { type: String, default: 'UTC' }
  },
  limits: {
    maxEmployees: { type: Number, default: 5 },
    maxBranches: { type: Number, default: 1 },
    hasAnalytics: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Clear cached model to ensure schema updates are applied
if (mongoose.models.Business) {
  delete mongoose.models.Business;
}

export default mongoose.model<IBusiness>('Business', BusinessSchema);
