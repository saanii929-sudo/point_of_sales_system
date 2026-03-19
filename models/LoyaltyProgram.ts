import mongoose, { Schema, Document } from 'mongoose';

export interface ILoyaltyProgram extends Document {
  customerId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lifetimeSpend: number;
  lifetimePoints: number;
  badges: {
    badgeId: string;
    name: string;
    description: string;
    earnedAt: Date;
  }[];
  currentStreak: number;
  longestStreak: number;
  lastPurchaseDate?: Date;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  referralCount: number;
  birthday?: Date;
  anniversaryDate: Date;
  lastBirthdayRewardUsed?: Date;
  lastAnniversaryRewardUsed?: Date;
  preferences: {
    emailReceipts: boolean;
    smsReceipts: boolean;
    marketingEmails: boolean;
    marketingSms: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyProgramSchema = new Schema<ILoyaltyProgram>({
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
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  lifetimeSpend: {
    type: Number,
    default: 0
  },
  lifetimePoints: {
    type: Number,
    default: 0
  },
  badges: [{
    badgeId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastPurchaseDate: {
    type: Date
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  birthday: {
    type: Date
  },
  anniversaryDate: {
    type: Date,
    default: Date.now
  },
  lastBirthdayRewardUsed: {
    type: Date
  },
  lastAnniversaryRewardUsed: {
    type: Date
  },
  preferences: {
    emailReceipts: {
      type: Boolean,
      default: true
    },
    smsReceipts: {
      type: Boolean,
      default: false
    },
    marketingEmails: {
      type: Boolean,
      default: true
    },
    marketingSms: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for customer-business uniqueness
LoyaltyProgramSchema.index({ customerId: 1, businessId: 1 }, { unique: true });

// Update tier based on points
LoyaltyProgramSchema.methods.updateTier = function() {
  if (this.points >= 5000) {
    this.tier = 'platinum';
  } else if (this.points >= 2000) {
    this.tier = 'gold';
  } else if (this.points >= 500) {
    this.tier = 'silver';
  } else {
    this.tier = 'bronze';
  }
};

// Get points multiplier based on tier
LoyaltyProgramSchema.methods.getPointsMultiplier = function(): number {
  const multipliers = {
    bronze: 1,
    silver: 1.25,
    gold: 1.5,
    platinum: 2
  };
  return multipliers[this.tier as keyof typeof multipliers];
};

// Check if birthday reward is available
LoyaltyProgramSchema.methods.isBirthdayRewardAvailable = function(): boolean {
  if (!this.birthday) return false;
  
  const today = new Date();
  const birthday = new Date(this.birthday);
  const lastUsed = this.lastBirthdayRewardUsed ? new Date(this.lastBirthdayRewardUsed) : null;
  
  // Check if birthday is within 7 days
  const daysUntilBirthday = Math.abs(
    new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate()).getTime() - today.getTime()
  ) / (1000 * 60 * 60 * 24);
  
  if (daysUntilBirthday > 7) return false;
  
  // Check if already used this year
  if (lastUsed && lastUsed.getFullYear() === today.getFullYear()) return false;
  
  return true;
};

// Check if anniversary reward is available
LoyaltyProgramSchema.methods.isAnniversaryRewardAvailable = function(): boolean {
  const today = new Date();
  const anniversary = new Date(this.anniversaryDate);
  const lastUsed = this.lastAnniversaryRewardUsed ? new Date(this.lastAnniversaryRewardUsed) : null;
  
  // Check if anniversary is within 7 days
  const daysUntilAnniversary = Math.abs(
    new Date(today.getFullYear(), anniversary.getMonth(), anniversary.getDate()).getTime() - today.getTime()
  ) / (1000 * 60 * 60 * 24);
  
  if (daysUntilAnniversary > 7) return false;
  
  // Check if already used this year
  if (lastUsed && lastUsed.getFullYear() === today.getFullYear()) return false;
  
  return true;
};

export default mongoose.models.LoyaltyProgram || mongoose.model<ILoyaltyProgram>('LoyaltyProgram', LoyaltyProgramSchema);
