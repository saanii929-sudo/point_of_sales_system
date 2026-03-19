import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Payroll from '@/models/Payroll';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    let query: any = { tenantId: session.tenantId };

    if (month && year) {
      query['period.month'] = parseInt(month);
      query['period.year'] = parseInt(year);
    }

    if (status) {
      query.status = status;
    }

    const payrolls = await Payroll.find(query)
      .populate('employeeId', 'name email')
      .populate('paidBy', 'name')
      .sort({ 'period.year': -1, 'period.month': -1, createdAt: -1 });

    return NextResponse.json({ payrolls });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { employeeId, period, basicSalary, allowances, deductions, bonus, overtime } = body;

    // Check if payroll already exists for this employee and period
    const existing = await Payroll.findOne({
      tenantId: session.tenantId,
      employeeId,
      'period.month': period.month,
      'period.year': period.year
    });

    if (existing) {
      return NextResponse.json({ error: 'Payroll already exists for this period' }, { status: 400 });
    }

    // Calculate totals
    const totalAllowances = allowances.reduce((sum: number, a: any) => sum + a.amount, 0);
    const totalDeductions = deductions.reduce((sum: number, d: any) => sum + d.amount, 0);
    const overtimePay = (overtime?.hours || 0) * (overtime?.rate || 0);
    const grossSalary = basicSalary + totalAllowances + (bonus || 0) + overtimePay;
    const netSalary = grossSalary - totalDeductions;

    const payroll = await Payroll.create({
      tenantId: session.tenantId,
      employeeId,
      period,
      basicSalary,
      allowances: allowances || [],
      deductions: deductions || [],
      bonus: bonus || 0,
      overtime: overtime || { hours: 0, rate: 0 },
      totalAllowances,
      totalDeductions,
      grossSalary,
      netSalary,
      status: 'pending'
    });

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employeeId', 'name email');

    return NextResponse.json({ payroll: populatedPayroll });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
