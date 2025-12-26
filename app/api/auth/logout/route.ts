// =====================================================================
// AINOVA - Logout API Route
// =====================================================================
// Purpose: User logout endpoint - invalidate session and clear cookie
// Route: POST /api/auth/logout
// Body: (none - uses session cookie)
// Response: { success: boolean, message?: string, error?: string }
// Cookie: sessionId (deleted)
// SECURITY: Best-effort session invalidation
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Invalidate session and clear session cookie
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract session ID from cookie
    const sessionId = request.cookies.get('sessionId')?.value;
    
    // 2. If no session cookie, user is already logged out
    if (!sessionId) {
      // Still return success and clear cookie (idempotent operation)
      const response = NextResponse.json({
        success: true,
        message: 'Already logged out',
      });
      
      // Clear cookie (in case client has stale cookie)
      response.cookies.delete('sessionId');
      
      return response;
    }
    
    // 3. Attempt to invalidate session in database
    // ✅ BEST-EFFORT: Even if DB fails, we still clear the cookie
    let dbSuccess = false;
    try {
      await logout(sessionId);
      dbSuccess = true;
      console.log(`[API] Logout successful: session=${sessionId}`);
    } catch (error) {
      // Log error but don't fail the request
      // Client-side logout is still valid (cookie will be cleared)
      console.error('[API] /auth/logout DB error (continuing with client logout):', error);
    }
    
    // 4. Create response
    const response = NextResponse.json({
      success: true,
      message: dbSuccess 
        ? 'Logged out successfully' 
        : 'Logged out (session cleanup may be incomplete)',
    });
    
    // 5. ✅ SECURITY: Delete session cookie
    // This is the critical step - even if DB fails, cookie is removed
    response.cookies.delete('sessionId');
    
    return response;
    
  } catch (error) {
    console.error('[API] /auth/logout unexpected error:', error);
    
    // Even on error, try to clear the cookie
    const response = NextResponse.json(
      {
        success: false,
        error: 'An error occurred during logout',
        message: 'Your session cookie has been cleared',
      },
      { status: 500 }
    );
    
    // ✅ BEST-EFFORT: Always clear cookie, even on error
    response.cookies.delete('sessionId');
    
    return response;
  }
}

/**
 * GET /api/auth/logout
 * Method not allowed (logout requires POST for security)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST request to logout',
      expectedFormat: {
        method: 'POST',
        body: {},  // No body required - uses session cookie
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
