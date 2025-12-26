// =====================================================================
// AINOVA - Change Password API Route
// =====================================================================
// Purpose: Allow authenticated users to change their password
// Route: POST /api/auth/change-password
// Body: { currentPassword: string, newPassword: string, confirmPassword: string }
// Response: { success: boolean, message?: string, error?: string }
// SECURITY: Session required, current password verification, password strength
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extract user info from middleware headers
    // Middleware validates session and adds user context to headers
    const userId = request.headers.get('x-user-id');
    const username = request.headers.get('x-username');
    
    // Sanity check: If no user info, session validation failed
    if (!userId || !username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }
    
    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON format',
        },
        { status: 400 }
      );
    }
    
    const { currentPassword, newPassword, confirmPassword } = body;
    
    // 3. ✅ Input validation
    // Check null/undefined
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password, new password, and confirmation are required',
        },
        { status: 400 }
      );
    }
    
    // Check type
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input format',
        },
        { status: 400 }
      );
    }
    
    // Check empty (do NOT trim - passwords may have intentional spaces)
    if (currentPassword.length === 0 || newPassword.length === 0 || confirmPassword.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Passwords cannot be empty',
        },
        { status: 400 }
      );
    }
    
    // ✅ Password length limits (DoS protection + UX)
    if (currentPassword.length > 500 || newPassword.length > 500 || confirmPassword.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password too long',
        },
        { status: 400 }
      );
    }
    
    // ✅ New password minimum length (security)
    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password must be at least 6 characters',
        },
        { status: 400 }
      );
    }
    
    // ✅ Password confirmation match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password and confirmation do not match',
        },
        { status: 400 }
      );
    }
    
    // ✅ New password must be different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password must be different from current password',
        },
        { status: 400 }
      );
    }
    
    // 4. Get database connection
    const pool = await getPool();
    
    // 5. Fetch user's current password hash
    const userResult = await pool
      .request()
      .input('userId', parseInt(userId))
      .query(`
        SELECT PasswordHash, IsActive
        FROM Users
        WHERE UserID = @userId
      `);
    
    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }
    
    const user = userResult.recordset[0];
    
    // Check if account is disabled
    if (!user.IsActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account is disabled',
        },
        { status: 403 }
      );
    }
    
    // 6. ✅ Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.PasswordHash);
    
    if (!isCurrentPasswordValid) {
      // ✅ AUDIT: Log failed password change attempt
      if (process.env.FE_LOGIN_AUDIT === 'true') {
        try {
          const ipAddress = 
            request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';
          
          await pool
            .request()
            .input('userId', parseInt(userId))
            .input('ipAddress', ipAddress)
            .input('success', false)
            .query(`
              INSERT INTO LoginHistory (UserID, LoginTime, IPAddress, Success)
              VALUES (@userId, GETDATE(), @ipAddress, @success)
            `);
        } catch (auditError) {
          console.error('[API] Audit log error (non-blocking):', auditError);
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Current password is incorrect',
        },
        { status: 401 }
      );
    }
    
    // 7. ✅ Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    // 8. Update password in database
    await pool
      .request()
      .input('userId', parseInt(userId))
      .input('passwordHash', newPasswordHash)
      .query(`
        UPDATE Users
        SET 
          PasswordHash = @passwordHash,
          IsFirstLogin = 0,
          UpdatedAt = GETDATE()
        WHERE UserID = @userId
      `);
    
    // 9. ✅ AUDIT: Log successful password change
    if (process.env.FE_LOGIN_AUDIT === 'true') {
      try {
        const ipAddress = 
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          request.headers.get('x-real-ip') ||
          'unknown';
        
        await pool
          .request()
          .input('userId', parseInt(userId))
          .input('ipAddress', ipAddress)
          .input('success', true)
          .query(`
            INSERT INTO LoginHistory (UserID, LoginTime, IPAddress, Success)
            VALUES (@userId, GETDATE(), @ipAddress, @success)
          `);
      } catch (auditError) {
        console.error('[API] Audit log error (non-blocking):', auditError);
      }
    }
    
    // 10. ✅ SECURITY: Invalidate other sessions (optional, configurable)
    // This forces re-login on all other devices after password change
    if (process.env.FE_LOGIN_INVALIDATE_SESSIONS_ON_PASSWORD_CHANGE === 'true') {
      const currentSessionId = request.cookies.get('sessionId')?.value;
      
      try {
        await pool
          .request()
          .input('userId', parseInt(userId))
          .input('currentSessionId', currentSessionId || '')
          .query(`
            DELETE FROM Sessions
            WHERE UserID = @userId
              AND SessionID != @currentSessionId
          `);
        
        console.log(`[API] Invalidated other sessions for user: ${username}`);
      } catch (sessionError) {
        console.error('[API] Session invalidation error (non-blocking):', sessionError);
      }
    }
    
    console.log(`[API] Password changed successfully: user=${username}`);
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
    
  } catch (error) {
    console.error('[API] /auth/change-password error:', error);
    
    // Generic error response (don't leak internal details)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/change-password
 * Method not allowed (password change requires POST)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Use POST request to change password',
      expectedFormat: {
        method: 'POST',
        headers: {
          'Cookie': 'sessionId=<valid-session-id>',
        },
        body: {
          currentPassword: 'string',
          newPassword: 'string',
          confirmPassword: 'string',
        },
      },
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST',
      },
    }
  );
}
