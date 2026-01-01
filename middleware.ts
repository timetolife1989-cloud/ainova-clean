// =====================================================================
// AINOVA - Next.js Middleware (Edge Runtime Compatible)
// =====================================================================
// Purpose: Protect routes that require authentication
// Runtime: Edge Runtime (NO Node.js APIs - uses fetch instead)
// Security: Validates sessionId cookie via API endpoint
// Function: middleware (Next.js standard naming)
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/validate-session', // Must be public so middleware can call it
]);

/**
 * Public path prefixes (regex patterns)
 */
const PUBLIC_PREFIXES = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/.*\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
];

/**
 * Check if a path is public
 */
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some(pattern => pattern.test(pathname));
}

/**
 * Helper: Redirect to login page with return URL
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Proxy: Protect routes that require authentication
 * ⚠️ EDGE RUNTIME: Cannot import lib/auth.ts (uses Node.js APIs)
 * ✅ SOLUTION: Use fetch() to call /api/auth/validate-session
 * 🔥 NEXT.JS 16: Function MUST be named "proxy" (not "middleware")
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
    console.log(`[Proxy] No session cookie, redirecting to login: ${pathname}`);
    return redirectToLogin(request);
  }
  
  // 4. Validate session via API endpoint (Edge Runtime → Node.js Runtime)
  try {
    // ✅ Build absolute URL for internal API call
    const validateUrl = new URL('/api/auth/validate-session', request.url);
    
    // ✅ Call validation API with session ID
    const response = await fetch(validateUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
    
    const data = await response.json();
    
    // Session invalid or expired → redirect to login
    if (!data.valid) {
      console.log(`[Proxy] Invalid/expired session, redirecting to login: ${pathname}`);
      
      // ✅ SECURITY: Clear invalid session cookie
      const redirectResponse = redirectToLogin(request);
      redirectResponse.cookies.delete('sessionId');
      return redirectResponse;
    }
    
    // 5. ✅ Session valid - add user info to request headers
    // API routes can access user data via headers without re-querying DB
    const requestHeaders = new Headers(request.headers);
    
    // ✅ Safely set headers only if data exists
    if (data.userId) requestHeaders.set('x-user-id', data.userId.toString());
    if (data.username) requestHeaders.set('x-username', data.username);
    if (data.role) requestHeaders.set('x-user-role', data.role);
    if (data.fullName) requestHeaders.set('x-user-fullname', data.fullName);
    
    console.log(`[Proxy] Session valid: ${pathname}, user=${data.username || 'unknown'}`);
    
    // Continue to requested page with user context
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
  } catch (error) {
    // ✅ SECURITY POLICY: Session validation failure handling
    // - Production: Fail-closed (503) = maximum security, deny access on DB errors
    // - Development: Fail-open (allow) = developer convenience, don't block on transient errors
    console.error('[Proxy] Session validation error:', error);
    
    if (process.env.NODE_ENV === 'production') {
      // Production: Block access during DB outages (security priority)
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Please try again in a moment',
        },
        { status: 503 }
      );
    }
    
    // Development: Allow access (convenience for developers)
    console.warn('[Proxy] Allowing request in development mode despite error');
    return NextResponse.next();
  }
}

// ✅ NEXT.JS 16 COMPATIBILITY: Export as both "proxy" (new) and "middleware" (legacy)
export { proxy as middleware };

/**
 * Proxy configuration
 * Specifies which routes this proxy applies to
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};