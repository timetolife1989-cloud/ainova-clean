// =====================================================================
// AINOVA - Authentication & Authorization Logic
// =====================================================================
// Purpose: Login, session management, rate limiting, audit trail
// Security: bcrypt, parameterized queries, rate limiting, audit logging
// PRODUCTION-READY: Feature flags, fail-safe, error handling, caching
// =====================================================================

import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getPool, sql } from './db';

// =====================================================================
// TypeScript Interfaces
// =====================================================================

/**
 * User database record (from dbo.AinovaUsers table)
 */
export interface User {
  UserId: number;
  Username: string;
  PasswordHash: string;
  FullName: string;
  Role: string;
  FirstLogin: boolean;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

/**
 * Login result (returned by login() function)
 */
export interface LoginResult {
  success: boolean;
  sessionId?: string;
  userId?: number;
  username?: string;
  fullName?: string;
  role?: string;
  firstLogin?: boolean;
  error?: string;
}

/**
 * Session validation result (returned by validateSession())
 */
export interface SessionData {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  expiresAt: Date;
}

// =====================================================================
// In-Memory Rate Limit Cache (fallback if DB fails)
// =====================================================================
// ⚠️ LIMITATION (Multi-Instance Deployment):
//   - In-memory cache is NOT synchronized across instances
//   - With 3 server instances, attacker can get 15 attempts (5×3)
//   - Production (load balanced): Use Redis-based rate limiting
//   - Current implementation: Acceptable for single-instance or <5 instances
// =====================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitCache.entries()) {
      if (now > entry.resetAt) {
        rateLimitCache.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

// =====================================================================
// Session Cache (reduces DB queries for frequent session validation)
// =====================================================================

interface SessionCacheEntry {
  data: SessionData;
  cachedAt: number;
}

const sessionCache = new Map<string, SessionCacheEntry>();
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =====================================================================
// Rate Limiting
// =====================================================================

/**
 * Check if IP address has exceeded rate limit (5 failed attempts in 15 minutes)
 * @param ipAddress - Client IP address
 * @throws Error if rate limit exceeded
 */
export async function checkRateLimit(ipAddress: string): Promise<void> {
  // Feature flag check
  if (process.env.FE_LOGIN_RATE_LIMIT !== 'true') {
    return; // Rate limiting disabled
  }

  try {
    const pool = await getPool();
    
    // Count failed login attempts from this IP in the last 15 minutes
    const result = await pool
      .request()
      .input('ipAddress', sql.NVarChar(50), ipAddress)
      .query(`
        SELECT COUNT(*) AS FailCount
        FROM dbo.LoginHistory
        WHERE IPAddress = @ipAddress
          AND Success = 0
          AND LoginTime > DATEADD(MINUTE, -15, SYSDATETIME())
      `);
    
    const failCount = result.recordset[0]?.FailCount || 0;
    
    if (failCount >= 5) {
      console.warn(`[Auth] Rate limit exceeded for IP: ${ipAddress}`);
      throw new Error('Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva.');
    }
    
  } catch (error) {
    // Re-throw rate limit errors (user exceeded limit)
    if (error instanceof Error && error.message.includes('Too many failed')) {
      throw error;
    }
    
    // ✅ FIX: DB error → fallback to in-memory rate limiting
    console.error('[Auth] Rate limit DB check failed, using in-memory fallback:', error);
    
    const now = Date.now();
    const cached = rateLimitCache.get(ipAddress);
    
    if (cached) {
      if (now < cached.resetAt) {
        // Within 15-minute window
        if (cached.count >= 5) {
          throw new Error('Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva.');
        }
        cached.count++;
      } else {
        // Reset window
        rateLimitCache.set(ipAddress, { count: 1, resetAt: now + 15 * 60 * 1000 });
      }
    } else {
      // First attempt from this IP
      rateLimitCache.set(ipAddress, { count: 1, resetAt: now + 15 * 60 * 1000 });
    }
  }
}

// =====================================================================
// Audit Logging Helper (non-blocking)
// =====================================================================

/**
 * Log login attempt to LoginHistory table (best-effort, non-blocking)
 * @param userId - User ID (null if user not found)
 * @param sessionId - Session ID (null if login failed)
 * @param ipAddress - Client IP address
 * @param success - Whether login succeeded
 * @param failureReason - Reason for failure (null if success)
 */
async function logLoginAttempt(
  userId: number | null,
  sessionId: string | null,
  ipAddress: string,
  success: boolean,
  failureReason: string | null
): Promise<void> {
  // Feature flag check
  if (process.env.FE_LOGIN_AUDIT !== 'true') {
    return;
  }

  try {
    const pool = await getPool();
    
    await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .input('ipAddress', sql.NVarChar(50), ipAddress)
      .input('success', sql.Bit, success)
      .input('failureReason', sql.NVarChar(200), failureReason)
      .query(`
        INSERT INTO dbo.LoginHistory (UserId, SessionId, LoginTime, IPAddress, Success, FailureReason)
        VALUES (@userId, @sessionId, SYSDATETIME(), @ipAddress, @success, @failureReason)
      `);
      
  } catch (error) {
    // ✅ FIX: Don't block login if audit fails (fail-open for audit)
    console.error('[Auth] Audit log failed (non-blocking):', error);
  }
}

// =====================================================================
// Login Function
// =====================================================================

/**
 * Authenticate user and create session
 * @param username - Username
 * @param password - Plain text password (will be compared with bcrypt hash)
 * @param ipAddress - Client IP address (for audit trail and rate limiting)
 * @returns LoginResult with sessionId on success, or error message on failure
 */
export async function login(
  username: string,
  password: string,
  ipAddress: string
): Promise<LoginResult> {
  try {
    const pool = await getPool();
    
    // 1. Rate limiting check
    await checkRateLimit(ipAddress);
    
    // 2. Fetch user from database (AINOVA Users table)
    const userResult = await pool
      .request()
      .input('username', sql.NVarChar(100), username)
      .query(`
        SELECT UserId, Username, PasswordHash, FullName, Role, FirstLogin, IsActive
        FROM dbo.AinovaUsers
        WHERE Username = @username
      `);
    
    const user = userResult.recordset[0] as User | undefined;
    
    // 3. User not found
    if (!user) {
      await logLoginAttempt(null, null, ipAddress, false, 'User not found');
      return {
        success: false,
        error: 'Hibás felhasználónév vagy jelszó',
      };
    }
    
    // 4. Check if user is active
    if (!user.IsActive) {
      await logLoginAttempt(user.UserId, null, ipAddress, false, 'User is inactive');
      return {
        success: false,
        error: 'A fiók le van tiltva. Kérjük, lépj kapcsolatba az ügyfélszolgálattal.',
      };
    }
    
    // 5. Verify password (handle both plain text and bcrypt hashed)
    // Development mode: dev/admin users use plain text passwords
    // Production mode: all passwords should be bcrypt hashed
    let passwordMatch = false;
    
    // Try bcrypt first (for hashed passwords)
    if (user.PasswordHash.startsWith('$2a$') || user.PasswordHash.startsWith('$2b$')) {
      // Bcrypt hash detected (starts with $2a$ or $2b$)
      passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    } else {
      // Plain text password (development mode only - dev/admin users)
      passwordMatch = password === user.PasswordHash;
      
      if (passwordMatch && process.env.NODE_ENV === 'production') {
        console.warn(`[Auth] WARNING: Plain text password detected for user ${username} in production!`);
      }
    }
    
    if (!passwordMatch) {
      await logLoginAttempt(user.UserId, null, ipAddress, false, 'Invalid password');
      return {
        success: false,
        error: 'Hibás felhasználónév vagy jelszó',
      };
    }
    
    // 6. Generate session ID (UUID v4)
    const sessionId = randomUUID();
    
    // 7. Calculate session expiration
    // ⚠️ TODO (STEP 7 - Login UI): Add "Remember me" checkbox support
    //   - Default (unchecked): 8 hours (better security - smaller hijack window)
    //   - Checked: 24 hours (user convenience)
    // ROADMAP requirement: 24h (will be refined with UI checkbox)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // 8. Create session in database
    try {
      await pool
        .request()
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .input('userId', sql.Int, user.UserId)
        .input('expiresAt', sql.DateTime2, expiresAt)
        .query(`
          INSERT INTO dbo.Sessions (SessionId, UserId, CreatedAt, ExpiresAt)
          VALUES (@sessionId, @userId, SYSDATETIME(), @expiresAt)
        `);
    } catch (sessionError) {
      // ✅ FIX: Better error message for session creation failure
      console.error('[Auth] Session creation failed:', sessionError);
      await logLoginAttempt(user.UserId, null, ipAddress, false, 'Session creation failed');
      return {
        success: false,
        error: 'Munkamenet létrehozása sikertelen. Próbáld újra.',
      };
    }
    
    // 9. Audit: Log successful login (non-blocking)
    await logLoginAttempt(user.UserId, sessionId, ipAddress, true, null);
    
    console.log(`[Auth] Login successful: user=${user.Username}, session=${sessionId}`);
    
    // 10. Return success with session data
    return {
      success: true,
      sessionId,
      userId: user.UserId,
      username: user.Username,
      fullName: user.FullName,
      role: user.Role,
      firstLogin: user.FirstLogin,
    };
    
  } catch (error) {
    console.error('[Auth] Login error:', error);
    
    // ✅ FIX: Differentiate error messages based on error type
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // Rate limit exceeded
      if (errorMsg.includes('too many failed') || errorMsg.includes('túl sok sikertelen')) {
        return { success: false, error: error.message };
      }
      
      // Application shutting down
      if (errorMsg.includes('shutting down')) {
        return { success: false, error: 'A szolgáltatás átmenetileg nem elérhető' };
      }
      
      // Network/connection errors - NOT on company network or no internet
      if (errorMsg.includes('enotfound') || errorMsg.includes('getaddrinfo')) {
        return { 
          success: false, 
          error: 'NETWORK_NOT_REACHABLE: Szerver nem elérhető. Ellenőrizd, hogy a céges hálózaton vagy (IvanTIM VPN).' 
        };
      }
      
      if (errorMsg.includes('etimedout') || errorMsg.includes('connection timeout') || errorMsg.includes('connectiontimeout')) {
        return { 
          success: false, 
          error: 'CONNECTION_TIMEOUT: Kapcsolati időtúllépés. Ellenőrizd a hálózati kapcsolatot.' 
        };
      }
      
      if (errorMsg.includes('econnrefused') || errorMsg.includes('connection refused')) {
        return { 
          success: false, 
          error: 'CONNECTION_REFUSED: A szerver elutasította a kapcsolatot. Lehet, hogy karbantartás alatt van.' 
        };
      }
      
      if (errorMsg.includes('esocket') || errorMsg.includes('socket')) {
        return { 
          success: false, 
          error: 'SOCKET_ERROR: Hálózati hiba. Ellenőrizd az internetkapcsolatot és a VPN-t.' 
        };
      }
      
      // SQL Server specific errors
      if (errorMsg.includes('login failed for user') || errorMsg.includes('cannot open database')) {
        return { 
          success: false, 
          error: 'DATABASE_ERROR: Adatbázis hiba. Kérjük, értesítsd az IT supportot.' 
        };
      }
    }
    
    // Generic error for unexpected failures
    return {
      success: false,
      error: 'Bejelentkezés sikertelen. Próbáld újra.',
    };
  }
}

// =====================================================================
// Session Validation (with caching)
// =====================================================================

/**
 * Validate session ID and return user data
 * Uses in-memory cache (5 min TTL) to reduce database load
 * @param sessionId - Session UUID
 * @returns SessionData if valid, null if expired/invalid
 */
export async function validateSession(sessionId: string): Promise<SessionData | null> {
  try {
    // 1. ✅ OPTIMIZATION: Check cache first (5 min TTL)
    const cached = sessionCache.get(sessionId);
    if (cached) {
      const age = Date.now() - cached.cachedAt;
      if (age < SESSION_CACHE_TTL) {
        // Cache hit - check if session is still valid
        if (cached.data.expiresAt.getTime() > Date.now()) {
          return cached.data;
        } else {
          // Session expired - remove from cache
          sessionCache.delete(sessionId);
        }
      }
    }
    
    // 2. Cache miss or expired - query database
    const pool = await getPool();
    
    const result = await pool
      .request()
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        SELECT 
          u.UserId,
          u.Username,
          u.FullName,
          u.Role,
          s.ExpiresAt
        FROM dbo.Sessions s
        JOIN dbo.AinovaUsers u ON s.UserId = u.UserId
        WHERE s.SessionId = @sessionId
          AND s.ExpiresAt > SYSDATETIME()
          AND u.IsActive = 1
      `);
    
    if (result.recordset.length === 0) {
      return null; // Session not found, expired, or user inactive
    }
    
    const record = result.recordset[0];
    
    // ✅ Convert ExpiresAt string to Date object
    const sessionData: SessionData = {
      userId: record.UserId,
      username: record.Username,
      fullName: record.FullName,
      role: record.Role,
      expiresAt: new Date(record.ExpiresAt),
    };
    
    // 3. ✅ OPTIMIZATION: Cache for 5 minutes
    sessionCache.set(sessionId, {
      data: sessionData,
      cachedAt: Date.now(),
    });
    
    return sessionData;
    
  } catch (error) {
    console.error('[Auth] Session validation error:', error);
    return null;
  }
}

// =====================================================================
// Logout Function
// =====================================================================

/**
 * Logout user by deleting session
 * @param sessionId - Session UUID to delete
 */
export async function logout(sessionId: string): Promise<void> {
  try {
    const pool = await getPool();
    
    await pool
      .request()
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        DELETE FROM dbo.Sessions
        WHERE SessionId = @sessionId
      `);
    
    // ✅ OPTIMIZATION: Remove from cache
    sessionCache.delete(sessionId);
    
    console.log(`[Auth] Logout successful: session=${sessionId}`);
    
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    // Don't throw - logout should be best-effort
  }
}

// =====================================================================
// Admin Functions
// =====================================================================

/**
 * Invalidate all sessions for a user (force re-login)
 * Use case: Admin changes user role/IsActive → stale cache must be cleared
 * @param userId - User ID whose sessions should be invalidated
 */
export async function invalidateUserSessions(userId: number): Promise<void> {
  try {
    // 1. Remove from cache (prevent stale data for 5 minutes)
    for (const [sessionId, cached] of sessionCache.entries()) {
      if (cached.data.userId === userId) {
        sessionCache.delete(sessionId);
      }
    }
    
    // 2. Delete from database (force re-login)
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        DELETE FROM dbo.Sessions
        WHERE UserId = @userId
      `);
    
    const deletedCount = result.rowsAffected[0];
    console.log(`[Auth] Invalidated ${deletedCount} session(s) for user ${userId}`);
    
  } catch (error) {
    console.error('[Auth] Session invalidation failed:', error);
    throw error; // Admin should know if this fails
  }
}
