import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { checkSession, apiSuccess, apiError, ApiErrors, getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

// =====================================================
// GET - Egy operátor részletei
// =====================================================
export async function GET(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  
  try {
    const { id } = await context.params;
    const operatorId = parseInt(id);
    
    if (isNaN(operatorId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Operátor adatok
    const operatorResult = await pool.request()
      .input('id', operatorId)
      .query(`
        SELECT 
          id, torzsszam, nev, muszak, pozicio,
          telefon, jogsi_gyalog_targonca, jogsi_forgo_daru, jogsi_futo_daru, jogsi_newton_emelo,
          megjegyzes, aktiv, created_at, updated_at
        FROM ainova_operatorok
        WHERE id = @id
      `);
    
    if (operatorResult.recordset.length === 0) {
      return apiError('Operátor nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    const operator = operatorResult.recordset[0];
    
    // Orvosi alkalmassági adatok
    const orvosiResult = await pool.request()
      .input('operator_torzsszam', operator.torzsszam)
      .query(`
        SELECT 
          id, pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes,
          CASE 
            WHEN lejarat < GETDATE() THEN 'lejart'
            WHEN lejarat <= DATEADD(day, 30, GETDATE()) THEN 'hamarosan'
            ELSE 'aktiv'
          END as statusz
        FROM ainova_operator_orvosi
        WHERE operator_torzsszam = @operator_torzsszam
        ORDER BY lejarat DESC
      `);
    
    return apiSuccess({
      ...operator,
      orvosik: orvosiResult.recordset,
    });
    
  } catch (error) {
    console.error('[Operator] Get error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}

// =====================================================
// PUT - Operátor módosítása
// =====================================================
export async function PUT(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    return ApiErrors.forbidden();
  }
  
  try {
    const { id } = await context.params;
    const operatorId = parseInt(id);
    
    if (isNaN(operatorId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const body = await request.json();
    const { 
      torzsszam, nev, muszak, pozicio, telefon, 
      jogsi_gyalog_targonca, jogsi_forgo_daru, jogsi_futo_daru, jogsi_newton_emelo,
      megjegyzes, aktiv 
    } = body;
    
    const pool = await getPool();
    
    // Ellenőrizzük, hogy létezik-e
    const existing = await pool.request()
      .input('id', operatorId)
      .query(`SELECT id FROM ainova_operatorok WHERE id = @id`);
    
    if (existing.recordset.length === 0) {
      return apiError('Operátor nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    // Ha törzsszámot módosítunk, ellenőrizzük a duplikációt
    if (torzsszam) {
      const duplicate = await pool.request()
        .input('torzsszam', torzsszam)
        .input('id', operatorId)
        .query(`SELECT id FROM ainova_operatorok WHERE torzsszam = @torzsszam AND id != @id`);
      
      if (duplicate.recordset.length > 0) {
        return apiError('Ez a törzsszám már másik operátorhoz tartozik', HTTP_STATUS.CONFLICT);
      }
    }
    
    await pool.request()
      .input('id', operatorId)
      .input('torzsszam', torzsszam)
      .input('nev', nev)
      .input('muszak', muszak)
      .input('pozicio', pozicio)
      .input('telefon', telefon || null)
      .input('jogsi_gyalog_targonca', jogsi_gyalog_targonca ? 1 : 0)
      .input('jogsi_forgo_daru', jogsi_forgo_daru ? 1 : 0)
      .input('jogsi_futo_daru', jogsi_futo_daru ? 1 : 0)
      .input('jogsi_newton_emelo', jogsi_newton_emelo ? 1 : 0)
      .input('megjegyzes', megjegyzes || null)
      .input('aktiv', aktiv !== undefined ? (aktiv ? 1 : 0) : 1)
      .query(`
        UPDATE ainova_operatorok SET
          torzsszam = @torzsszam,
          nev = @nev,
          muszak = @muszak,
          pozicio = @pozicio,
          telefon = @telefon,
          jogsi_gyalog_targonca = @jogsi_gyalog_targonca,
          jogsi_forgo_daru = @jogsi_forgo_daru,
          jogsi_futo_daru = @jogsi_futo_daru,
          jogsi_newton_emelo = @jogsi_newton_emelo,
          megjegyzes = @megjegyzes,
          aktiv = @aktiv,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log(`[Operator] Updated: ${operatorId}`);
    
    return apiSuccess({ message: 'Operátor módosítva' });
    
  } catch (error) {
    console.error('[Operator] Update error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}

// =====================================================
// DELETE - Operátor deaktiválása (soft delete)
// =====================================================
export async function DELETE(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin') {
    return ApiErrors.forbidden();
  }
  
  try {
    const { id } = await context.params;
    const operatorId = parseInt(id);
    
    if (isNaN(operatorId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Soft delete - csak deaktiválás
    await pool.request()
      .input('id', operatorId)
      .query(`
        UPDATE ainova_operatorok SET aktiv = 0, updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log(`[Operator] Deactivated: ${operatorId}`);
    
    return apiSuccess({ message: 'Operátor deaktiválva' });
    
  } catch (error) {
    console.error('[Operator] Delete error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}
