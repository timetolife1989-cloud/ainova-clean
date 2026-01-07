// =====================================================
// AINOVA - Admin Verification API
// =====================================================
// Purpose: Verify admin credentials from database
// Method: POST
// Body: { username: string, password: string }
// Response: { success: boolean, error?: string }
// =====================================================

import { NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import bcrypt from 'bcrypt';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Felhasználónév és jelszó megadása kötelező',
      }, { status: 400 });
    }
    
    const pool = await getPool();
    
    // Fetch user from database
    const userResult = await pool
      .request()
      .input('username', sql.NVarChar(100), username)
      .query(`
        SELECT UserId, Username, PasswordHash, Role, IsActive
        FROM dbo.AinovaUsers
        WHERE Username = @username
      `);
    
    const user = userResult.recordset[0];
    
    // User not found
    if (!user) {
      console.log(`[Admin] Verification failed: user not found - ${username}`);
      return NextResponse.json({
        success: false,
        error: 'Hibás felhasználói adatok vagy nincs jogosultság',
      }, { status: 401 });
    }
    
    // Check if user is active
    if (!user.IsActive) {
      console.log(`[Admin] Verification failed: user inactive - ${username}`);
      return NextResponse.json({
        success: false,
        error: 'A fiók le van tiltva',
      }, { status: 401 });
    }
    
    // Check if user has admin role (case-insensitive)
    if (user.Role?.toLowerCase() !== 'admin') {
      console.log(`[Admin] Verification failed: not admin role - ${username} (role: ${user.Role})`);
      return NextResponse.json({
        success: false,
        error: 'Nincs admin jogosultság',
      }, { status: 403 });
    }
    
    // Verify password (handle both plain text and bcrypt hashed)
    let passwordMatch = false;
    
    if (user.PasswordHash.startsWith('$2a$') || user.PasswordHash.startsWith('$2b$')) {
      // Bcrypt hash detected
      passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    } else {
      // Plain text password (development mode only)
      passwordMatch = password === user.PasswordHash;
    }
    
    if (!passwordMatch) {
      console.log(`[Admin] Verification failed: invalid password - ${username}`);
      return NextResponse.json({
        success: false,
        error: 'Hibás felhasználói adatok vagy nincs jogosultság',
      }, { status: 401 });
    }
    
    // Success
    console.log(`[Admin] Verification successful - ${username}`);
    return NextResponse.json({
      success: true,
      message: 'Admin verified',
    });
    
  } catch (error) {
    console.error('[Admin] Verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Szerver hiba történt',
    }, { status: 500 });
  }
}
