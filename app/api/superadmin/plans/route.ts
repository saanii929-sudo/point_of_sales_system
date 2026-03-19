import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import SubscriptionPlan from '@/models/SubscriptionPlan';

export async function GET() {
  try {
    const session = await getSession();
    
    // Only super admin can access
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1, createdAt: 1 });

    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Get plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { 
      name, 
      displayName, 
      description, 
      price, 
      billingCycle,
      features,
      limits,
      isDefault,
      sortOrder
    } = body;

    if (!name || !displayName || !description || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await SubscriptionPlan.updateMany({}, { isDefault: false });
    }

    const plan = await SubscriptionPlan.create({
      name: name.toLowerCase().replace(/\s+/g, '_'),
      displayName,
      description,
      price,
      billingCycle: billingCycle || 'monthly',
      features: features || [],
      limits: limits || {},
      isDefault: isDefault || false,
      sortOrder: sortOrder || 0
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: any) {
    console.error('Create plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { planId, ...updates } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await SubscriptionPlan.updateMany({ _id: { $ne: planId } }, { isDefault: false });
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      { $set: updates },
      { new: true }
    );

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error('Update plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      planId,
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete plan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
