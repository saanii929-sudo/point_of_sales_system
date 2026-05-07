import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Business from '@/models/Business';
import { getSubscriptionState } from '@/lib/subscription';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.userId).select('-password');

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // For non-super-admin users, attach live subscription state
    let subscription = null;
    if (user.role !== 'super_admin' && user.tenantId) {
      const business = await Business.findById(user.tenantId).select(
        'subscriptionStatus subscriptionExpiry subscriptionPlan isActive approvalStatus'
      );
      if (business) {
        subscription = getSubscriptionState(business);
      }
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId?.toString() || null,
        branchId: user.branchId?.toString() || null,
      },
      subscription,
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
