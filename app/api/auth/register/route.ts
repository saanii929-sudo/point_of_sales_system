import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import User from '@/models/User';
import Business from '@/models/Business';
import SubscriptionPlan from '@/models/SubscriptionPlan';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { businessName, email, password, name, phone, address, planName } = body;

    if (!businessName || !email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Resolve plan — fall back to default/starter if not provided or not found
    let plan = null;
    if (planName) {
      plan = await SubscriptionPlan.findOne({ name: planName, isActive: true });
    }
    if (!plan) {
      plan = await SubscriptionPlan.findOne({ isDefault: true, isActive: true });
    }

    const chosenPlan = plan?.name ?? 'starter';
    const planLimits = plan?.limits ?? { maxEmployees: 5, maxBranches: 1, maxProducts: 500, hasAnalytics: false };

    // Trial starts from the moment the superadmin approves — not from registration.
    // subscriptionExpiry is intentionally null until approval.
    const business = await Business.create({
      name: businessName,
      email,
      phone: phone || '',
      address: address || '',
      subscriptionPlan: chosenPlan,
      subscriptionStatus: 'trial',
      subscriptionExpiry: null,
      limits: planLimits,
      approvalStatus: 'pending',
      isActive: false,
    });

    const hashedPassword = await hashPassword(password);
    await User.create({
      tenantId: business._id,
      email,
      password: hashedPassword,
      name,
      role: 'business_owner',
      phone,
    });

    // No JWT issued — account must be approved by superadmin before login is possible
    return NextResponse.json({
      success: true,
      pending: true,
      business: { name: business.name, plan: chosenPlan },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
