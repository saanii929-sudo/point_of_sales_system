import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayroll extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  period: {
    month: number;
    year: number;
  };
  basicSalary: number;
  allowances: {
    name: string;
    amount: number;
  }[];
  deductions: {
    name: string;
    amount: number;
  }[];
  bonus: number;
  overtime: {
    hours: number;
    rate: number;
  };
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'pending' | 'approved' | 'paid';
  paidDate?: Date;
  paidBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true }
  },
  basicSalary: { type: Number, required: true },
  allowances: [{
    name: String,
    amount: Number
  }],
  deductions: [{
    name: String,
    amount: Number
  }],
  bonus: { type: Number, default: 0 },
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 }
  },
  totalAllowances: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  grossSalary: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'paid'], default: 'pending' },
  paidDate: Date,
  paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

PayrollSchema.index({ tenantId: 1, employeeId: 1, 'period.month': 1, 'period.year': 1 }, { unique: true });
PayrollSchema.index({ tenantId: 1, status: 1 });

export default (mongoose.models.Payroll as Model<IPayroll>) || mongoose.model<IPayroll>('Payroll', PayrollSchema);
