import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Payroll from '@/models/Payroll';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { action, ...updateData } = body;

    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    if (payroll.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'approve') {
      payroll.status = 'approved';
    } else if (action === 'pay') {
      payroll.status = 'paid';
      payroll.paidDate = new Date();
      payroll.paidBy = session.userId as any;
    } else if (action === 'reject') {
      payroll.status = 'pending';
    } else {
      // Update payroll details
      if (updateData.basicSalary !== undefined) payroll.basicSalary = updateData.basicSalary;
      if (updateData.allowances !== undefined) payroll.allowances = updateData.allowances;
      if (updateData.deductions !== undefined) payroll.deductions = updateData.deductions;
      if (updateData.bonus !== undefined) payroll.bonus = updateData.bonus;
      if (updateData.overtime !== undefined) payroll.overtime = updateData.overtime;
      if (updateData.notes !== undefined) payroll.notes = updateData.notes;

      // Recalculate totals
      payroll.totalAllowances = payroll.allowances.reduce((sum, a) => sum + a.amount, 0);
      payroll.totalDeductions = payroll.deductions.reduce((sum, d) => sum + d.amount, 0);
      const overtimePay = payroll.overtime.hours * payroll.overtime.rate;
      payroll.grossSalary = payroll.basicSalary + payroll.totalAllowances + payroll.bonus + overtimePay;
      payroll.netSalary = payroll.grossSalary - payroll.totalDeductions;
    }

    await payroll.save();

    const updatedPayroll = await Payroll.findById(id)
      .populate('employeeId', 'name email')
      .populate('paidBy', 'name');

    return NextResponse.json({ payroll: updatedPayroll });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'business_owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    if (payroll.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (payroll.status === 'paid') {
      return NextResponse.json({ error: 'Cannot delete paid payroll' }, { status: 400 });
    }

    await Payroll.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Payroll deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
