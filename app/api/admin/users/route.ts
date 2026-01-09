// =====================================================
// AINOVA - Admin Users API
// =====================================================
// Purpose: List and create users
// GET: List users with pagination, search, filters
// POST: Create new user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';
import bcrypt from 'bcrypt';
import { DEFAULT_PAGE_SIZE, BCRYPT_ROUNDS } from '@/lib/constants';

export const runtime = 'nodejs';

// =====================================================
// GET - Felhasználók listázása
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Paraméterek
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const shift = searchParams.get('shift') || '';
    const isActiveParam = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE));
    
    const pool = await getPool();
    
    // Dinamikus WHERE építése
    const conditions: string[] = [];
    const countRequest = pool.request();
    const dataRequest = pool.request();
    
    if (search) {
      conditions.push('(Username LIKE @search OR FullName LIKE @search)');
      const searchPattern = `%${search}%`;
      countRequest.input('search', sql.NVarChar(200), searchPattern);
      dataRequest.input('search', sql.NVarChar(200), searchPattern);
    }
    
    if (role) {
      conditions.push('Role = @role');
      countRequest.input('role', sql.NVarChar(50), role);
      dataRequest.input('role', sql.NVarChar(50), role);
    }
    
    if (shift) {
      if (shift === 'null') {
        conditions.push('Shift IS NULL');
      } else {
        conditions.push('Shift = @shift');
        countRequest.input('shift', sql.NVarChar(10), shift);
        dataRequest.input('shift', sql.NVarChar(10), shift);
      }
    }
    
    if (isActiveParam !== null && isActiveParam !== '') {
      conditions.push('IsActive = @isActive');
      const isActiveValue = isActiveParam === 'true' ? 1 : 0;
      countRequest.input('isActive', sql.Bit, isActiveValue);
      dataRequest.input('isActive', sql.Bit, isActiveValue);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Összszám lekérése
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total FROM dbo.AinovaUsers ${whereClause}
    `);
    const totalItems = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalItems / pageSize);
    const offset = (page - 1) * pageSize;
    
    // Adatok lekérése
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('pageSize', sql.Int, pageSize);
    
    const dataResult = await dataRequest.query(`
      SELECT 
        UserId as id,
        Username as username,
        FullName as fullName,
        Role as role,
        Shift as shift,
        Email as email,
        IsActive as isActive,
        CreatedAt as createdAt
      FROM dbo.AinovaUsers
      ${whereClause}
      ORDER BY 
        CASE Role 
          WHEN 'Admin' THEN 1 
          WHEN 'Manager' THEN 2 
          WHEN 'Műszakvezető' THEN 3 
          WHEN 'Műszakvezető helyettes' THEN 4 
          WHEN 'NPI Technikus' THEN 5 
          WHEN 'Operátor' THEN 6 
          ELSE 99 
        END,
        FullName
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);
    
    const users = dataResult.recordset.map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      shift: user.shift,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt?.toISOString(),
    }));
    
    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    });
    
  } catch (error) {
    console.error('[Admin Users] GET error:', getErrorMessage(error));
    return NextResponse.json({
      success: false,
      error: 'Hiba történt a felhasználók lekérésekor',
    }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}

// =====================================================
// POST - Új felhasználó létrehozása
// =====================================================
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validation - all required fields
    if (!data.username || !data.name || !data.password || !data.role) {
      return NextResponse.json({
        success: false,
        error: 'Minden kötelező mező kitöltése szükséges (törzsszám, név, jelszó, pozíció)',
      }, { status: 400 });
    }

    // Validate username (törzsszám) length
    if (data.username.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'A törzsszám minimum 3 karakter',
      }, { status: 400 });
    }

    // Validate password length
    if (data.password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'A jelszó minimum 8 karakter',
      }, { status: 400 });
    }

    // Validate shift (optional, but if provided must be valid)
    const validShifts = ['A', 'B', 'C', null];
    if (data.shift !== undefined && !validShifts.includes(data.shift)) {
      return NextResponse.json({
        success: false,
        error: 'Érvénytelen műszak',
      }, { status: 400 });
    }

    // Validate email format if provided
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return NextResponse.json({
        success: false,
        error: 'Érvénytelen email cím formátum',
      }, { status: 400 });
    }

    const pool = await getPool();

    // Check if username already exists
    const existingUser = await pool
      .request()
      .input('username', sql.NVarChar(100), data.username)
      .query(`
        SELECT UserId FROM dbo.AinovaUsers WHERE Username = @username
      `);

    if (existingUser.recordset.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Ez a felhasználónév már foglalt',
      }, { status: 409 });
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const existingEmail = await pool
        .request()
        .input('email', sql.NVarChar(255), data.email)
        .query(`
          SELECT UserId FROM dbo.AinovaUsers WHERE Email = @email
        `);

      if (existingEmail.recordset.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Ez az email cím már használatban van',
        }, { status: 409 });
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Insert new user
    const result = await pool
      .request()
      .input('username', sql.NVarChar(100), data.username)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .input('fullName', sql.NVarChar(200), data.name)
      .input('role', sql.NVarChar(50), data.role)
      .input('shift', sql.NVarChar(10), data.shift || null)
      .input('email', sql.NVarChar(255), data.email || null)
      .input('firstLogin', sql.Bit, 1)
      .input('isActive', sql.Bit, 1)
      .query(`
        INSERT INTO dbo.AinovaUsers (Username, PasswordHash, FullName, Role, Shift, Email, FirstLogin, IsActive, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.UserId, INSERTED.Username, INSERTED.FullName, INSERTED.Role, INSERTED.Shift, INSERTED.Email, INSERTED.CreatedAt
        VALUES (@username, @passwordHash, @fullName, @role, @shift, @email, @firstLogin, @isActive, SYSDATETIME(), SYSDATETIME())
      `);

    const newUser = result.recordset[0];

    console.log(`[Admin] User created: ${data.username} (Role: ${data.role}, Shift: ${data.shift || 'none'})`);

    return NextResponse.json({
      success: true,
      message: 'Felhasználó sikeresen létrehozva!',
      user: {
        id: newUser.UserId,
        username: newUser.Username,
        name: newUser.FullName,
        role: newUser.Role,
        shift: newUser.Shift,
        email: newUser.Email,
        createdAt: newUser.CreatedAt,
      },
    });

  } catch (error) {
    console.error('[Admin] User creation error:', getErrorMessage(error));
    return NextResponse.json({
      success: false,
      error: 'Szerver hiba történt a felhasználó létrehozásakor',
    }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
