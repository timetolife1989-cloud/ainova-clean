// =====================================================================
// AINOVA - Authentication Proxy
// =====================================================================
// Purpose:  Protect routes that require authentication
// Public routes: /login, /api/auth/login, static files
// Protected routes: Everything else (dashboard, API endpoints, etc.)
// Action: Redirect to /login if not authenticated
// SECURITY: Session validation, cookie-based auth, user context headers
// PRODUCTION-READY: Fail-closed (prod), fail-open (dev), invalid session cleanup
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = new Set([
  '/login',
  '/api/auth/login',
  '/api/weather', // Weather API is public (used by WeatherWidget)
]);

/**
 * Public path prefixes (regex patterns)
 */
const PUBLIC_PREFIXES = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/.*\. (?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
];

/**
 * Check if a path is public
 */
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES. some(pattern => pattern.test(pathname));
}

/**
 * Helper: Redirect to login page with return URL
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnUrl', request. nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// =====================================================================
// 🔥 NEXT.JS 16: Function MUST be named "proxy" (not "middleware")
// =====================================================================
/**
 * Proxy:  Protect routes that require authentication
 * Validates session cookie and adds user context to request headers
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Allow public routes without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // 2. Extract session ID from cookie
  const sessionId = request.cookies.get('sessionId')?.value;
  
  // 3. No session cookie → redirect to login
  if (!sessionId) {
    console.log(`[Proxy] No session cookie, redirecting to login:  ${pathname}`);
    return redirectToLogin(request);
  }
  
  // 4. Validate session in database
  try {
    const session = await validateSession(sessionId);
    
    // Session invalid or expired → redirect to login
    if (!session) {
      console.log(`[Proxy] Invalid/expired session, redirecting to login:  ${pathname}`);
      
      // ✅ SECURITY: Clear invalid session cookie
      const response = redirectToLogin(request);
      response.cookies.delete('sessionId');
      return response;
    }
    
    // 5. ✅ Session valid - add user info to request headers
    // API routes can access user data via headers without re-querying DB
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId.toString());
    requestHeaders.set('x-username', session.username);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-fullname', session. fullName);
    
    // Continue to requested page with user context
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
  } catch (error) {
    // ✅ SECURITY POLICY: Session validation failure handling
    // - Production:  Fail-closed (503) = maximum security, deny access on DB errors
    // - Development: Fail-open (allow) = developer convenience, don't block on transient errors
    console.error('[Proxy] Session validation error:', error);
    
    if (process.env.NODE_ENV === 'production') {
      // Production: Block access during DB outages (security priority)
      return NextResponse.json(
        {
          error:  'Service temporarily unavailable',
          message:  'Please try again in a moment',
        },
        { status: 503 }
      );
    }
    
    // Development: Allow access (convenience for developers)
    console.warn('[Proxy] Allowing request in development mode despite error');
    return NextResponse.next();
  }
}

// =====================================================================
// Proxy configuration
// =====================================================================
/**
 * Specifies which routes this proxy applies to
 */
export const config = {
  matcher: [
    '/((?! _next/static|_next/image|favicon.ico).*)',
  ],
};

// =====================================================================
// 🔥 NEXT.JS 16: Runtime export REMOVED
// =====================================================================
// Proxy ALWAYS runs on Node.js runtime (automatic in Next.js 16)
// Manual runtime export is NOT allowed and causes error
// =====================================================================