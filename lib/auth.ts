import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

console.log('JWT_SECRET loaded:', JWT_SECRET ? 'Yes' : 'No', '(length:', JWT_SECRET?.length, ')');

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  console.log('Generating token with secret length:', JWT_SECRET.length);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log('Verifying token with secret length:', JWT_SECRET.length);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('Token verified successfully for user:', decoded.email);
    return decoded;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    console.log('No token found in cookies');
    return null;
  }
  
  console.log('Token found in cookies, verifying...');
  return verifyToken(token);
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
};

// For use in Route Handlers — sets cookie directly on the NextResponse
export function setAuthCookieOnResponse(response: NextResponse, token: string): void {
  response.cookies.set('token', token, COOKIE_OPTIONS);
  console.log('Auth cookie set on response');
}

export function clearAuthCookieOnResponse(response: NextResponse): void {
  response.cookies.set('token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
}

// For use in Server Actions / Server Components
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('token', token, COOKIE_OPTIONS);
  console.log('Auth cookie set successfully');
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}
