import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/test-auth'];
const authPaths = ['/login', '/register'];

function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Allow public paths without token
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const session = token ? decodeToken(token) : null;

  // Redirect authenticated users away from auth pages
  if (authPaths.includes(pathname)) {
    if (session) {
      const roleMap: Record<string, string> = {
        super_admin: '/superadmin',
        cashier: '/dashboard/pos',
        inventory_staff: '/dashboard/products',
      };
      return NextResponse.redirect(new URL(roleMap[session.role] ?? '/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect super admin routes
  if (pathname.startsWith('/superadmin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const roleRestrictions: Record<string, string[]> = {
      cashier: ['/dashboard/pos', '/dashboard/sales', '/dashboard/customers'],
      inventory_staff: ['/dashboard/products', '/dashboard/inventory'],
    };

    const allowed = roleRestrictions[session.role];
    if (allowed) {
      const isAllowed = allowed.some(p => pathname.startsWith(p));
      if (!isAllowed && pathname !== '/dashboard') {
        return NextResponse.redirect(new URL(allowed[0], request.url));
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
