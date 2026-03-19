import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner and manager can view employees
    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // Super admin can see all employees, others only their tenant
    const query = session.role === 'super_admin'
      ? { role: { $ne: 'super_admin' } }
      : { tenantId: session.tenantId, role: { $ne: 'super_admin' } };

    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({ employees });
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

    // Only business_owner can create employees
    if (!['super_admin', 'business_owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { name, email, password, role, phone } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const employee = await User.create({
      tenantId: session.tenantId,
      name,
      email,
      password: hashedPassword,
      role,
      phone
    });

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
