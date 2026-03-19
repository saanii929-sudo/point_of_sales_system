import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    default: null
  },
  applicableTo: {
    type: String,
    enum: ['all', 'specific_products', 'specific_categories'],
    default: 'all'
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usageCount: {
    type: Number,
    default: 0
  },
  usagePerCustomer: {
    type: Number,
    default: null // null means unlimited per customer
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for business and code uniqueness
discountSchema.index({ business: 1, code: 1 }, { unique: true });

// Index for active discounts
discountSchema.index({ business: 1, isActive: 1, startDate: 1, endDate: 1 });

// Method to check if discount is valid
discountSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) return { valid: false, reason: 'Discount is inactive' };
  
  // Check date range
  if (now < this.startDate) return { valid: false, reason: 'Discount not yet started' };
  if (now > this.endDate) return { valid: false, reason: 'Discount has expired' };
  
  // Check usage limit
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    return { valid: false, reason: 'Discount usage limit reached' };
  }
  
  return { valid: true };
};

// Method to calculate discount amount
discountSchema.methods.calculateDiscount = function(subtotal: number, items: any[]) {
  let discountAmount = 0;
  
  // Check minimum purchase amount
  if (subtotal < this.minPurchaseAmount) {
    return { amount: 0, reason: `Minimum purchase amount of $${this.minPurchaseAmount} required` };
  }
  
  // Calculate based on applicability
  if (this.applicableTo === 'all') {
    // Apply to entire cart
    if (this.type === 'percentage') {
      discountAmount = (subtotal * this.value) / 100;
    } else {
      discountAmount = this.value;
    }
  } else if (this.applicableTo === 'specific_products') {
    // Apply only to specific products
    const applicableTotal = items
      .filter(item => this.products.some((p: any) => p.toString() === item.product.toString()))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (this.type === 'percentage') {
      discountAmount = (applicableTotal * this.value) / 100;
    } else {
      discountAmount = Math.min(this.value, applicableTotal);
    }
  } else if (this.applicableTo === 'specific_categories') {
    // Apply only to specific categories
    const applicableTotal = items
      .filter(item => this.categories.some((c: any) => c.toString() === item.category?.toString()))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (this.type === 'percentage') {
      discountAmount = (applicableTotal * this.value) / 100;
    } else {
      discountAmount = Math.min(this.value, applicableTotal);
    }
  }
  
  // Apply max discount cap if set
  if (this.maxDiscountAmount !== null) {
    discountAmount = Math.min(discountAmount, this.maxDiscountAmount);
  }
  
  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);
  
  return { amount: Math.round(discountAmount * 100) / 100, reason: null };
};

const Discount = mongoose.models.Discount || mongoose.model('Discount', discountSchema);

export default Discount;
