import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Fetch full user data from database
    await connectDB();
    const user = await User.findById(session.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ 
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId?.toString() || null
      }
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
