import mongoose, { Schema, Document } from 'mongoose';

export interface ISelfCheckoutSession extends Document {
  sessionId: string;
  customerId?: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  cart: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    scannedAt: Date;
  }[];
  status: 'active' | 'payment_pending' | 'completed' | 'abandoned';
  requiresAgeVerification: boolean;
  ageVerifiedBy?: mongoose.Types.ObjectId;
  exitPassCode?: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

const SelfCheckoutSessionSchema = new Schema<ISelfCheckoutSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  branchId: {
    type: Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  cart: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    scannedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'payment_pending', 'completed', 'abandoned'],
    default: 'active',
    index: true
  },
  requiresAgeVerification: {
    type: Boolean,
    default: false
  },
  ageVerifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  exitPassCode: {
    type: String
  },
  subtotal: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  completedAt: {
    type: Date
  }
});

// Index for cleanup of expired sessions
SelfCheckoutSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Calculate totals before saving
SelfCheckoutSessionSchema.pre('save', function(next) {
  this.subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.tax = this.subtotal * 0.1; // 10% tax
  this.total = this.subtotal + this.tax;
  next();
});

export default mongoose.models.SelfCheckoutSession || mongoose.model<ISelfCheckoutSession>('SelfCheckoutSession', SelfCheckoutSessionSchema);
