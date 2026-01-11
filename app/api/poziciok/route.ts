// =====================================================
// AINOVA - Pozíciók API
// =====================================================
// Purpose: Distinct pozíciók lekérése az operátor táblából
// Method: GET
// Query params:
//   - kihagyKategoria: Kihagyandó kategória (pl. "Vezetői")
//   - onlyProduktiv: Ha true, csak Produktív kategória + Megadandó
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
    const onlyProduktiv = searchParams.get('onlyProduktiv') === 'true';

    // Pozíciók a referencia táblából
    const req = pool.request();
    
    if (onlyProduktiv) {
      // Csak Produktív kategória + az operátoroknál használt "Megadandó" pozíció
      const query = `
        -- Produktív pozíciók a referencia táblából
        SELECT id, nev, kategoria, sorrend
        FROM ainova_poziciok
        WHERE kategoria = 'Produktív'
        
        UNION ALL
        
        -- "Megadandó" - olyan operátorok akiknek nincs beállított munkakör
        SELECT 
          999 as id, 
          'Megadandó' as nev, 
          NULL as kategoria, 
          998 as sorrend
        WHERE EXISTS (
          SELECT 1 FROM ainova_operatorok WHERE pozicio = 'Megadandó'
        )
        
        ORDER BY sorrend, nev
      `;
      const result = await req.query(query);
      return apiSuccess(result.recordset);
    }
    
    // Hagyományos szűrés
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
