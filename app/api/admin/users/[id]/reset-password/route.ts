// =====================================================
// AINOVA - Admin User Password Reset API
// =====================================================
// Purpose: Reset user password to default
// Route: POST /api/admin/users/[id]/reset-password
// Response: { success: boolean, message?: string, error?: string }
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/lib/constants';

export const runtime = 'nodejs';

// Default password for reset (user will be forced to change on first login)
const DEFAULT_PASSWORD = 'Ainova2025!';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset user password to default
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Érvénytelen felhasználó azonosító',
      }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const pool = await getPool();

    // Check if user exists
    const existingResult = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`SELECT UserId, Username, FullName, Role FROM dbo.AinovaUsers WHERE UserId = @userId`);

    if (existingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Felhasználó nem található',
      }, { status: HTTP_STATUS.NOT_FOUND });
    }

    const user = existingResult.recordset[0];

    // Hash the default password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

    // Update password and set FirstLogin flag
    await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE dbo.AinovaUsers
        SET PasswordHash = @passwordHash,
            FirstLogin = 1,
            UpdatedAt = SYSDATETIME()
        WHERE UserId = @userId
      `);

    console.log(`[Admin] Password reset for user: ${user.Username} (ID: ${userId})`);

    return NextResponse.json({
      success: true,
      message: `Jelszó visszaállítva: ${user.FullName || user.Username}`,
      defaultPassword: DEFAULT_PASSWORD,
    });

  } catch (error) {
    console.error('[Admin] Password reset error:', getErrorMessage(error));
    return NextResponse.json({
      success: false,
      error: 'Hiba történt a jelszó visszaállításakor',
    }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
