// =====================================================
// AINOVA - Pozíciók API
// =====================================================
// Purpose: Distinct pozíciók lekérése az operátor táblából
// Method: GET
// =====================================================

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { checkSession, apiSuccess, ApiErrors, getErrorMessage } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const pool = await getPool();

    // Distinct pozíciók lekérése (ahol nem 'Admin adja meg' és nem üres)
    const result = await pool.request().query(`
      SELECT DISTINCT pozicio AS nev
      FROM ainova_operatorok
      WHERE pozicio IS NOT NULL 
        AND pozicio <> ''
        AND pozicio <> 'Admin adja meg'
        AND aktiv = 1
      ORDER BY pozicio
    `);

    return apiSuccess(result.recordset);

  } catch (error) {
    console.error('[Pozíciók API] Error:', error);
    return ApiErrors.internal(error, 'Pozíciók API');
  }
}
