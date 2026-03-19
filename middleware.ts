import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/test-auth'];
const authPaths = ['/login', '/register'];

// Simple JWT decode without verification (we'll verify in API routes)
function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.log('Middleware - Token expired');
      return null;
    }
    
    console.log('Middleware - Token decoded for:', decoded.email);
    return decoded;
  } catch (error: any) {
    console.error('Middleware - Token decode error:', error.message);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  console.log('Middleware - Path:', pathname, 'Token exists:', !!token);

  // Allow public paths without token
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if user has token (basic check, full verification happens in API)
  const session = token ? decodeToken(token) : null;
  
  console.log('Middleware - Session:', session ? 'Valid' : 'Invalid');

  // Redirect authenticated users away from auth pages
  if (authPaths.includes(pathname)) {
    if (session) {
      // Redirect based on role
      let redirectUrl = '/dashboard';
      
      if (session.role === 'super_admin') {
        redirectUrl = '/superadmin';
      } else if (session.role === 'cashier') {
        redirectUrl = '/dashboard/pos';
      } else if (session.role === 'inventory_staff') {
        redirectUrl = '/dashboard/products';
      }
      
      console.log('Middleware - Redirecting authenticated user to', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // Protect super admin routes
  if (pathname.startsWith('/superadmin')) {
    if (!session) {
      console.log('Middleware - Redirecting unauthenticated user to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (session.role !== 'super_admin') {
      console.log('Middleware - Unauthorized access to super admin area');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      console.log('Middleware - Redirecting unauthenticated user to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based route restrictions
    const roleRestrictions: { [key: string]: string[] } = {
      'cashier': ['/dashboard/pos', '/dashboard/sales', '/dashboard/customers'],
      'inventory_staff': ['/dashboard/products', '/dashboard/inventory'],
    };

    // Check if user has role restrictions
    if (roleRestrictions[session.role]) {
      const allowedPaths = roleRestrictions[session.role];
      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));
      
      if (!isAllowed && pathname !== '/dashboard') {
        console.log(`Middleware - ${session.role} attempting to access restricted path: ${pathname}`);
        // Redirect to their first allowed path
        return NextResponse.redirect(new URL(allowedPaths[0], request.url));
      }
    }

    // Add session to headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-tenant-id', session.tenantId);
    requestHeaders.set('x-user-role', session.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)' 
  ]
};
