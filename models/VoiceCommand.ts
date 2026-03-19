import mongoose, { Schema, Document } from 'mongoose';

export interface IVoiceCommand extends Document {
  commandId: string;
  userId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  transcript: string;
  intent: string;
  entities: any;
  confidence: number;
  success: boolean;
  errorMessage?: string;
  executionTime: number;
  language: string;
  createdAt: Date;
}

const VoiceCommandSchema = new Schema<IVoiceCommand>({
  commandId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  transcript: {
    type: String,
    required: true
  },
  intent: {
    type: String,
    required: true,
    index: true
  },
  entities: {
    type: Schema.Types.Mixed
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  success: {
    type: Boolean,
    required: true,
    index: true
  },
  errorMessage: {
    type: String
  },
  executionTime: {
    type: Number,
    required: true
  },
  language: {
    type: String,
    default: 'en-US'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for analytics
VoiceCommandSchema.index({ businessId: 1, createdAt: -1 });
VoiceCommandSchema.index({ userId: 1, success: 1 });

export default mongoose.models.VoiceCommand || mongoose.model<IVoiceCommand>('VoiceCommand', VoiceCommandSchema);
