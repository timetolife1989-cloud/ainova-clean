import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { checkSession, apiSuccess, apiError, ApiErrors, getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

type RouteParams = { params: Promise<{ id: string; orvosiId: string }> };

// =====================================================
// PUT - Orvosi alkalmasság módosítása
// =====================================================
export async function PUT(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    return ApiErrors.forbidden();
  }
  
  try {
    const { id, orvosiId } = await context.params;
    const operatorId = parseInt(id);
    const orvosId = parseInt(orvosiId);
    
    if (isNaN(operatorId) || isNaN(orvosId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const body = await request.json();
    const { pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes } = body;
    
    const pool = await getPool();
    
    // Lekérjük az operátor törzsszámát
    const opResult = await pool.request()
      .input('id', operatorId)
      .query(`SELECT torzsszam FROM ainova_operatorok WHERE id = @id`);
    
    if (opResult.recordset.length === 0) {
      return apiError('Operátor nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    const torzsszam = opResult.recordset[0].torzsszam;
    
    // Ellenőrizzük, hogy létezik-e
    const existing = await pool.request()
      .input('id', orvosId)
      .input('operator_torzsszam', torzsszam)
      .query(`SELECT id FROM ainova_operator_orvosi WHERE id = @id AND operator_torzsszam = @operator_torzsszam`);
    
    if (existing.recordset.length === 0) {
      return apiError('Orvosi bejegyzés nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    // Pozíció név frissítése ha szükséges
    let finalPozicioNev = pozicio_nev;
    if (pozicio_id && !pozicio_nev) {
      const pozResult = await pool.request()
        .input('pozicio_id', pozicio_id)
        .query(`SELECT nev FROM ainova_poziciok WHERE id = @pozicio_id`);
      finalPozicioNev = pozResult.recordset[0]?.nev || 'Ismeretlen';
    }
    
    await pool.request()
      .input('id', orvosId)
      .input('pozicio_id', pozicio_id)
      .input('pozicio_nev', finalPozicioNev)
      .input('kezdete', new Date(kezdete))
      .input('lejarat', new Date(lejarat))
      .input('megjegyzes', megjegyzes || null)
      .query(`
        UPDATE ainova_operator_orvosi SET
          pozicio_id = @pozicio_id,
          pozicio_nev = @pozicio_nev,
          kezdete = @kezdete,
          lejarat = @lejarat,
          megjegyzes = @megjegyzes,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log(`[Operator Orvosi] Updated: ${orvosId}`);
    
    return apiSuccess({ message: 'Orvosi bejegyzés módosítva' });
    
  } catch (error) {
    console.error('[Operator Orvosi] Update error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}

// =====================================================
// DELETE - Orvosi alkalmasság törlése
// =====================================================
export async function DELETE(request: NextRequest, context: RouteParams) {
  const session = await checkSession(request);
  if (!session.valid) return ApiErrors.unauthorized();
  if (session.role !== 'Admin' && session.role !== 'Manager') {
    return ApiErrors.forbidden();
  }
  
  try {
    const { id, orvosiId } = await context.params;
    const operatorId = parseInt(id);
    const orvosId = parseInt(orvosiId);
    
    if (isNaN(operatorId) || isNaN(orvosId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Lekérjük az operátor törzsszámát
    const opResult = await pool.request()
      .input('id', operatorId)
      .query(`SELECT torzsszam FROM ainova_operatorok WHERE id = @id`);
    
    if (opResult.recordset.length === 0) {
      return apiError('Operátor nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    const torzsszam = opResult.recordset[0].torzsszam;
    
    await pool.request()
      .input('id', orvosId)
      .input('operator_torzsszam', torzsszam)
      .query(`DELETE FROM ainova_operator_orvosi WHERE id = @id AND operator_torzsszam = @operator_torzsszam`);
    
    console.log(`[Operator Orvosi] Deleted: ${orvosId}`);
    
    return apiSuccess({ message: 'Orvosi bejegyzés törölve' });
    
  } catch (error) {
    console.error('[Operator Orvosi] Delete error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}
