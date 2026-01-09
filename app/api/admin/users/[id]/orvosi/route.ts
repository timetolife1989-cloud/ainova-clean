// =====================================================
// AINOVA - User Orvosi API
// =====================================================
// Purpose: User orvosi alkalmassági kezelése
// GET: Lista lekérése
// POST: Új bejegyzés hozzáadása
// =====================================================

import { NextRequest } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { checkSession, apiSuccess, apiError, ApiErrors, getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

// =====================================================
// GET - User orvosi alkalmassági listája
// =====================================================
export async function GET(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Ellenőrizzük, hogy a user létezik
    const userResult = await pool.request()
      .input('id', sql.Int, userId)
      .query(`SELECT UserId FROM AinovaUsers WHERE UserId = @id`);
    
    if (userResult.recordset.length === 0) {
      return apiError('Felhasználó nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    // Ellenőrizzük, hogy a tábla létezik-e
    const tableCheck = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ainova_user_orvosi'
    `);
    
    if (tableCheck.recordset.length === 0) {
      // Tábla nem létezik még - üres lista
      return apiSuccess([]);
    }
    
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          id, pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes,
          CASE 
            WHEN lejarat < GETDATE() THEN 'lejart'
            WHEN lejarat <= DATEADD(day, 30, GETDATE()) THEN 'hamarosan'
            ELSE 'aktiv'
          END as statusz,
          DATEDIFF(day, GETDATE(), lejarat) as napok_hatra
        FROM ainova_user_orvosi
        WHERE user_id = @user_id
        ORDER BY lejarat DESC
      `);
    
    return apiSuccess(result.recordset);
    
  } catch (error) {
    console.error('[User Orvosi] List error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}

// =====================================================
// POST - Új orvosi alkalmasság hozzáadása
// =====================================================
export async function POST(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    return ApiErrors.forbidden();
  }
  
  try {
    const { id } = await context.params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const body = await request.json();
    const { pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes } = body;
    
    if (!pozicio_id || !kezdete || !lejarat) {
      return apiError('Pozíció, kezdete és lejárat kötelező', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Ellenőrizzük, hogy a user létezik
    const user = await pool.request()
      .input('id', sql.Int, userId)
      .query(`SELECT UserId, Username FROM AinovaUsers WHERE UserId = @id`);
    
    if (user.recordset.length === 0) {
      return apiError('Felhasználó nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    // Pozíció név lekérése ha nem adták meg
    let finalPozicioNev = pozicio_nev;
    if (!finalPozicioNev) {
      const pozResult = await pool.request()
        .input('pozicio_id', sql.Int, pozicio_id)
        .query(`SELECT nev FROM ainova_poziciok WHERE id = @pozicio_id`);
      finalPozicioNev = pozResult.recordset[0]?.nev || 'Ismeretlen';
    }
    
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .input('pozicio_id', sql.Int, pozicio_id)
      .input('pozicio_nev', sql.NVarChar(100), finalPozicioNev)
      .input('kezdete', sql.Date, new Date(kezdete))
      .input('lejarat', sql.Date, new Date(lejarat))
      .input('megjegyzes', sql.NVarChar(500), megjegyzes || null)
      .query(`
        INSERT INTO ainova_user_orvosi 
          (user_id, pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes)
        OUTPUT INSERTED.id
        VALUES 
          (@user_id, @pozicio_id, @pozicio_nev, @kezdete, @lejarat, @megjegyzes)
      `);
    
    console.log(`[User Orvosi] Added for user ${user.recordset[0].Username}: ${finalPozicioNev}`);
    
    return apiSuccess({ id: result.recordset[0].id }, { status: HTTP_STATUS.CREATED });
    
  } catch (error) {
    console.error('[User Orvosi] Create error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}
