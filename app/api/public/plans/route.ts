import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import SubscriptionPlan from '@/models/SubscriptionPlan';

export async function GET() {
  try {
    await connectDB();

    // Get only active plans, sorted by sortOrder
    const plans = await SubscriptionPlan.find({ isActive: true })
      .select('-createdAt -updatedAt -__v')
      .sort({ sortOrder: 1, price: 1 });

    return NextResponse.json({ plans });
  } catch (error: any) {
    console.error('Public plans error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
