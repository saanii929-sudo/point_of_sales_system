import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyPassword, generateToken, setAuthCookieOnResponse } from '@/lib/auth';
import User from '@/models/User';
import Business from '@/models/Business';

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
      if (!business || !business.isActive) {
        console.log('Business inactive');
        return NextResponse.json(
          { error: 'Business account is inactive' },
          { status: 403 }
        );
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

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
