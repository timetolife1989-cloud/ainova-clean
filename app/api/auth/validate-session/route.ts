// =====================================================================
// AINOVA - Session Validation API (for Edge Runtime middleware)
// =====================================================================
// Purpose: Validate session ID (called by middleware.ts)
// Route: POST /api/auth/validate-session
// Body: { sessionId: string }
// Response: { valid: boolean, userId?: number, username?: string, role?: string, fullName?: string }
// Runtime: Node.js (required for SQL database access)
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

// ✅ CRITICAL: Force Node.js runtime (SQL driver requires it)
export const runtime = 'nodejs';

/**
 * POST /api/auth/validate-session
 * Validate session ID and return user data
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { valid: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    const { sessionId } = body;

    // 2. Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Missing or invalid sessionId' },
        { status: 400 }
      );
    }

    // 3. Validate session using lib/auth.ts (with 5-min cache)
    // ✅ This is OK here because API routes run in Node.js runtime
    const sessionData = await validateSession(sessionId);

    // 4. Session invalid or expired
    if (!sessionData) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // 5. Session valid - return user data
    return NextResponse.json({
      valid: true,
      userId: sessionData.userId,
      username: sessionData.username,
      fullName: sessionData.fullName,
      role: sessionData.role,
    });

  } catch (error) {
    console.error('[API] Session validation error:', error);
    
    // Generic error response
    return NextResponse.json(
      { valid: false, error: 'Session validation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/validate-session
 * Method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST to validate session',
    },
    { 
      status: 405,
      headers: { 'Allow': 'POST' },
    }
  );
}
