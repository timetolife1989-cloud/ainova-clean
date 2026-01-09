import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { checkSession, apiSuccess, apiError, ApiErrors, getErrorMessage, HTTP_STATUS } from '@/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

// =====================================================
// GET - Operátor orvosi alkalmassági listája
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
    
    // Először megkeressük a törzsszámot
    const opResult = await pool.request()
      .input('id', operatorId)
      .query(`SELECT torzsszam FROM ainova_operatorok WHERE id = @id`);
    
    if (opResult.recordset.length === 0) {
      return apiError('Operátor nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    const torzsszam = opResult.recordset[0].torzsszam;
    
    const result = await pool.request()
      .input('operator_torzsszam', torzsszam)
      .query(`
        SELECT 
          id, pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes,
          CASE 
            WHEN lejarat < GETDATE() THEN 'lejart'
            WHEN lejarat <= DATEADD(day, 30, GETDATE()) THEN 'hamarosan'
            ELSE 'aktiv'
          END as statusz,
          DATEDIFF(day, GETDATE(), lejarat) as napok_hatra
        FROM ainova_operator_orvosi
        WHERE operator_torzsszam = @operator_torzsszam
        ORDER BY lejarat DESC
      `);
    
    return apiSuccess(result.recordset);
    
  } catch (error) {
    console.error('[Operator Orvosi] List error:', error);
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
    const operatorId = parseInt(id);
    
    if (isNaN(operatorId)) {
      return apiError('Érvénytelen ID', HTTP_STATUS.BAD_REQUEST);
    }
    
    const body = await request.json();
    const { pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes } = body;
    
    if (!pozicio_id || !kezdete || !lejarat) {
      return apiError('Pozíció, kezdete és lejárat kötelező', HTTP_STATUS.BAD_REQUEST);
    }
    
    const pool = await getPool();
    
    // Ellenőrizzük, hogy az operátor létezik és lekérjük a törzsszámot
    const operator = await pool.request()
      .input('id', operatorId)
      .query(`SELECT id, torzsszam FROM ainova_operatorok WHERE id = @id`);
    
    if (operator.recordset.length === 0) {
      return apiError('Operátor nem található', HTTP_STATUS.NOT_FOUND);
    }
    
    const torzsszam = operator.recordset[0].torzsszam;
    
    // Pozíció név lekérése ha nem adták meg
    let finalPozicioNev = pozicio_nev;
    if (!finalPozicioNev) {
      const pozResult = await pool.request()
        .input('pozicio_id', pozicio_id)
        .query(`SELECT nev FROM ainova_poziciok WHERE id = @pozicio_id`);
      finalPozicioNev = pozResult.recordset[0]?.nev || 'Ismeretlen';
    }
    
    const result = await pool.request()
      .input('operator_torzsszam', torzsszam)
      .input('pozicio_id', pozicio_id)
      .input('pozicio_nev', finalPozicioNev)
      .input('kezdete', new Date(kezdete))
      .input('lejarat', new Date(lejarat))
      .input('megjegyzes', megjegyzes || null)
      .query(`
        INSERT INTO ainova_operator_orvosi 
          (operator_torzsszam, pozicio_id, pozicio_nev, kezdete, lejarat, megjegyzes)
        OUTPUT INSERTED.id
        VALUES 
          (@operator_torzsszam, @pozicio_id, @pozicio_nev, @kezdete, @lejarat, @megjegyzes)
      `);
    
    console.log(`[Operator Orvosi] Added for operator ${torzsszam}: ${finalPozicioNev}`);
    
    return apiSuccess({ id: result.recordset[0].id }, { status: HTTP_STATUS.CREATED });
    
  } catch (error) {
    console.error('[Operator Orvosi] Create error:', error);
    return apiError(getErrorMessage(error), HTTP_STATUS.INTERNAL_ERROR);
  }
}
