import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyPassword, generateToken, setAuthCookieOnResponse } from '@/lib/auth';
import User from '@/models/User';
import Business from '@/models/Business';
import { getSubscriptionState, subscriptionDeniedResponse } from '@/lib/subscription';
import { logActivity } from '@/lib/logActivity';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { email, password } = body;

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      console.log('User not found or inactive');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      console.log('Invalid password');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check business status (if not super admin)
    if (user.role !== 'super_admin') {
      const business = await Business.findById(user.tenantId);
      if (!business) {
        return NextResponse.json({ error: 'Business account not found' }, { status: 403 });
      }
      if (business.approvalStatus === 'pending') {
        return NextResponse.json(
          { error: 'Your account is awaiting approval. Please contact the admin to complete your onboarding.' },
          { status: 403 }
        );
      }
      if (business.approvalStatus === 'rejected') {
        return NextResponse.json(
          { error: 'Your registration was not approved. Please contact support for more information.' },
          { status: 403 }
        );
      }
      if (!business.isActive) {
        return NextResponse.json({ error: 'Your business account has been deactivated.' }, { status: 403 });
      }

      // Enforce subscription expiry
      const sub = getSubscriptionState(business);
      if (!sub.isActive) {
        return NextResponse.json({ ...subscriptionDeniedResponse(sub), subscriptionExpired: true }, { status: 403 });
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logActivity({
      tenantId:  user.tenantId?.toString() || '',
      userId:    user._id.toString(),
      action:    'login',
      entity:    'User',
      entityId:  user._id.toString(),
      details:   { name: user.name, role: user.role },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim()
                 || req.headers.get('x-real-ip')
                 || undefined,
    });

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      tenantId: user.tenantId?.toString() || '',
      role: user.role,
      email: user.email
    });

    console.log('Token generated, setting cookie...');

    console.log('Login successful for:', email);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    });
    setAuthCookieOnResponse(response, token);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
