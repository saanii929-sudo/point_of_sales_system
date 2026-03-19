import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import Business from '@/models/Business';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { businessName, email, password, name, phone, address } = body;

    // Validate input
    if (!businessName || !email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create business
    const business = await Business.create({
      name: businessName,
      email,
      phone: phone || '',
      address: address || '',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'trial',
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      limits: {
        maxEmployees: 5,
        maxBranches: 1,
        hasAnalytics: false
      }
    });

    // Create business owner
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      tenantId: business._id,
      email,
      password: hashedPassword,
      name,
      role: 'business_owner',
      phone
    });

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      tenantId: business._id.toString(),
      role: user.role,
      email: user.email
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: business._id
      },
      business: {
        id: business._id,
        name: business.name
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
