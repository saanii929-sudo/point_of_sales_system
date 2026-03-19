import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface ISale extends Document {
  tenantId: mongoose.Types.ObjectId;
  saleNumber: string;
  items: ISaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  discountCode?: string;
  discountId?: mongoose.Types.ObjectId;
  total: number;
  profit: number;
  paymentMethod: 'cash' | 'card' | 'split';
  paymentDetails?: {
    cash?: number;
    card?: number;
  };
  customer?: mongoose.Types.ObjectId;
  cashier: mongoose.Types.ObjectId;
  status: 'completed' | 'refunded' | 'held';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  saleNumber: { type: String, required: true, unique: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    cost: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountCode: { type: String },
  discountId: { type: Schema.Types.ObjectId, ref: 'Discount' },
  total: { type: Number, required: true },
  profit: { type: Number, required: true },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'split'],
    required: true 
  },
  paymentDetails: {
    cash: Number,
    card: Number
  },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['completed', 'refunded', 'held'],
    default: 'completed'
  },
  notes: String
}, { timestamps: true });

SaleSchema.index({ tenantId: 1, createdAt: -1 });
SaleSchema.index({ tenantId: 1, cashier: 1 });
SaleSchema.index({ tenantId: 1, customer: 1 });

export default (mongoose.models.Sale as Model<ISale>) || mongoose.model<ISale>('Sale', SaleSchema);
