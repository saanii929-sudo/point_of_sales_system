import { NextResponse } from 'next/server';
import { clearAuthCookieOnResponse } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    clearAuthCookieOnResponse(response);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
