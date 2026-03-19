import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  subject: string;
  message: string;
  status: 'pending' | 'contacted' | 'converted' | 'rejected';
  notes?: string;
  submittedAt: Date;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  businessName: String,
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'converted', 'rejected'],
    default: 'pending'
  },
  notes: String,
  submittedAt: { type: Date, required: true },
  respondedAt: Date,
  respondedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

ContactSubmissionSchema.index({ email: 1 });
ContactSubmissionSchema.index({ status: 1, submittedAt: -1 });

export default (mongoose.models.ContactSubmission as Model<IContactSubmission>) || 
  mongoose.model<IContactSubmission>('ContactSubmission', ContactSubmissionSchema);
