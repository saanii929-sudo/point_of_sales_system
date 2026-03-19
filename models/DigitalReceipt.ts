import mongoose, { Schema, Document } from 'mongoose';

export interface IDigitalReceipt extends Document {
  receiptId: string;
  saleId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  deliveryMethod: 'email' | 'sms' | 'both';
  email?: string;
  phone?: string;
  sentAt?: Date;
  opened: boolean;
  openedAt?: Date;
  pointsEarned: number;
  pointsRedeemed: number;
  newPointsBalance: number;
  tierAtPurchase: string;
  pdfUrl?: string;
  webUrl: string;
  createdAt: Date;
}

const DigitalReceiptSchema = new Schema<IDigitalReceipt>({
  receiptId: {
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
  deliveryMethod: {
    type: String,
    enum: ['email', 'sms', 'both'],
    required: true
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  sentAt: {
    type: Date
  },
  opened: {
    type: Boolean,
    default: false
  },
  openedAt: {
    type: Date
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  pointsRedeemed: {
    type: Number,
    default: 0
  },
  newPointsBalance: {
    type: Number,
    default: 0
  },
  tierAtPurchase: {
    type: String,
    required: true
  },
  pdfUrl: {
    type: String
  },
  webUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export default mongoose.models.DigitalReceipt || mongoose.model<IDigitalReceipt>('DigitalReceipt', DigitalReceiptSchema);
