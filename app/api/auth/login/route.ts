// =====================================================================
// AINOVA - Login API Route
// =====================================================================
// Purpose: User authentication endpoint
// Route: POST /api/auth/login
// Body: { username: string, password: string }
// Response: { success: boolean, redirect?: string, error?: string }
// Cookie: sessionId (HTTP-only, secure, 24h expiration)
// SECURITY: Input validation, rate limiting, DoS protection
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Érvénytelen JSON formátum',
        },
        { status: 400 }
      );
    }
    
    const { username, password } = body;
    
    // 2. ✅ FIXED: Comprehensive input validation
    // Check null/undefined
    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Felhasználónév és jelszó megadása kötelező',
        },
        { status: 400 }
      );
    }
    
    // Check type
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Érvénytelen bemenet formátum',
        },
        { status: 400 }
      );
    }
    
    // ✅ FIX #1: Trim ONLY username (password may have intentional spaces)
    const trimmedUsername = username.trim();
    
    // Check empty username
    if (trimmedUsername.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'A felhasználónév nem lehet üres',
        },
        { status: 400 }
      );
    }
    
    // Check empty password (do NOT trim - spaces may be intentional)
    if (password.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'A jelszó nem lehet üres',
        },
        { status: 400 }
      );
    }
    
    // ✅ FIX #2: Input length limits (DoS protection)
    // Username: max 100 chars (database schema limit)
    // Password: max 500 chars (allow passphrases, but prevent DoS)
    if (trimmedUsername.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'A felhasználónév túl hosszú',
        },
        { status: 400 }
      );
    }
    
    if (password.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'A jelszó túl hosszú',
        },
        { status: 400 }
      );
    }
    
    // 3. Extract IP address for rate limiting and audit
    // Priority: x-forwarded-for (proxy) → x-real-ip → remote address → unknown
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = 
      (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    // 4. Attempt login (username trimmed, password NOT trimmed)
    const result = await login(trimmedUsername, password, ipAddress);
    
    // 5. Login failed
    if (!result.success) {
      // Determine status code based on error type
      let statusCode = 401; // Unauthorized (default)
      
      if (result.error?.includes('Rate limit') || result.error?.includes('Too many')) {
        statusCode = 429; // Too Many Requests
      } else if (result.error?.includes('temporarily unavailable') || result.error?.includes('shutting down')) {
        statusCode = 503; // Service Unavailable
      } else if (result.error?.includes('disabled')) {
        statusCode = 403; // Forbidden (account disabled)
      }
      
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Bejelentkezés sikertelen',
        },
        { status: statusCode }
      );
    }
    
    // 6. Login successful - create response with user data
    const responseBody: any = {
      success: true,
      user: {
        userId: result.userId,
        username: result.username,
        fullName: result.fullName,
        role: result.role,
      },
    };
    
    // ✅ Feature flag: FE_LOGIN_FIRST_LOGIN_FORCE
    // If enabled and user is first login, force password change
    if (process.env.FE_LOGIN_FIRST_LOGIN_FORCE === 'true' && result.firstLogin) {
      responseBody.redirect = '/change-password';
      responseBody.message = 'First login detected. Please change your password.';
      responseBody.firstLogin = true;
    }
    
    const response = NextResponse.json(responseBody);
    
    // 7. ✅ SECURITY: Set session cookie (HTTP-only, secure, SameSite)
    response.cookies.set('sessionId', result.sessionId!, {
      httpOnly: true,  // ✅ Prevent XSS access to cookie (document.cookie won't work)
      secure: process.env.NODE_ENV === 'production',  // ✅ HTTPS-only in production
      sameSite: 'lax',  // ✅ CSRF protection (cookie not sent on cross-site POST)
      maxAge: 24 * 60 * 60,  // 24 hours (in seconds)
      path: '/',  // Cookie available for entire site
    });
    
    console.log(`[API] Login successful: user=${result.username}, session=${result.sessionId}, ip=${ipAddress}`);
    
    return response;
    
  } catch (error) {
    console.error('[API] /auth/login error:', error);
    
    // Generic error response (don't leak internal details)
    return NextResponse.json(
      {
        success: false,
        error: 'Váratlan hiba történt. Próbáld újra.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/login
 * Method not allowed (login requires POST)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Ez a metódus nem engedélyezett',
      message: 'Használj POST kérést a bejelentkezéshez',
      expectedFormat: {
        method: 'POST',
        body: {
          username: 'string',
          password: 'string',
        },
      },
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST',  // ✅ RESTful: Tell client which methods are allowed
      },
    }
  );
}
