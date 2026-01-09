// =====================================================
// AINOVA - Pozíciók API
// =====================================================
// Purpose: Distinct pozíciók lekérése az operátor táblából
// Method: GET
// Query params:
//   - kihagyKategoria: Kihagyandó kategória (pl. "Vezetői")
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
    
    // Query paraméterek
    const { searchParams } = new URL(request.url);
    const kihagyKategoria = searchParams.get('kihagyKategoria');

    // Pozíciók a referencia táblából
    const req = pool.request();
    let query = `
      SELECT id, nev, kategoria, sorrend
      FROM ainova_poziciok
    `;
    
    // Ha van kihagyandó kategória, szűrjük
    if (kihagyKategoria) {
      query += ` WHERE kategoria != @kihagyKategoria`;
      req.input('kihagyKategoria', kihagyKategoria);
    }
    
    query += ` ORDER BY sorrend, nev`;
    
    const result = await req.query(query);

    return apiSuccess(result.recordset);

  } catch (error) {
    console.error('[Pozíciók API] Error:', error);
    return ApiErrors.internal(error, 'Pozíciók API');
  }
}
