import mongoose, { Schema, Document } from 'mongoose';

export interface IBNPLTransaction extends Document {
  transactionId: string;
  saleId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  provider: 'klarna' | 'afterpay' | 'affirm';
  providerTransactionId: string;
  amount: number;
  currency: string;
  installments: number;
  installmentAmount: number;
  firstPaymentDate: Date;
  status: 'pending' | 'authorized' | 'captured' | 'declined' | 'refunded' | 'partially_refunded';
  merchantFee: number;
  settlementDate?: Date;
  refundAmount?: number;
  webhookEvents: {
    event: string;
    receivedAt: Date;
    data: any;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BNPLTransactionSchema = new Schema<IBNPLTransaction>({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  saleId: {
    type: Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['klarna', 'afterpay', 'affirm'],
    required: true,
    index: true
  },
  providerTransactionId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  installments: {
    type: Number,
    required: true
  },
  installmentAmount: {
    type: Number,
    required: true
  },
  firstPaymentDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'declined', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  merchantFee: {
    type: Number,
    required: true
  },
  settlementDate: {
    type: Date
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  webhookEvents: [{
    event: {
      type: String,
      required: true
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    data: {
      type: Schema.Types.Mixed
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate merchant fee based on provider
BNPLTransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    const feeRates = {
      klarna: 0.0329,
      afterpay: 0.05,
      affirm: 0.029
    };
    
    const fixedFee = 0.30;
    this.merchantFee = (this.amount * feeRates[this.provider]) + fixedFee;
  }
  next();
});

export default mongoose.models.BNPLTransaction || mongoose.model<IBNPLTransaction>('BNPLTransaction', BNPLTransactionSchema);
