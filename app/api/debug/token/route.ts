import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-12345';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({
        hasToken: false,
        message: 'No token found in cookies'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return NextResponse.json({
        hasToken: true,
        isValid: true,
        decoded,
        tokenLength: token.length,
        secretLength: JWT_SECRET.length
      });
    } catch (error: any) {
      return NextResponse.json({
        hasToken: true,
        isValid: false,
        error: error.message,
        tokenLength: token.length,
        secretLength: JWT_SECRET.length
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
