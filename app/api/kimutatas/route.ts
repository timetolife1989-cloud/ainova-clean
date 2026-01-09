// =====================================================
// AINOVA - Kimutatás API
// =====================================================
// Purpose: Létszám és leadás statisztikák lekérése
// Method: GET
// Query: period=napi|heti|havi
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { checkSession, ApiErrors } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'napi';

    const pool = await getPool();

    // Időszak meghatározása
    let daysBack = 7;
    if (period === 'heti') daysBack = 28;
    if (period === 'havi') daysBack = 90;

    // Lekérdezés - napi összesítés műszakonként
    const result = await pool.request()
      .input('daysBack', sql.Int, daysBack)
      .query(`
        SELECT 
          l.datum,
          l.muszak,
          -- Produktív létszám (operatív, kivéve MEÓ)
          SUM(CASE WHEN l.pozicio_tipus = 'operativ' THEN l.megjelent ELSE 0 END) AS prodMegjelent,
          SUM(CASE WHEN l.pozicio_tipus = 'operativ' THEN l.tappenz ELSE 0 END) AS prodTappenz,
          SUM(CASE WHEN l.pozicio_tipus = 'operativ' THEN l.szabadsag ELSE 0 END) AS prodSzabadsag,
          SUM(CASE WHEN l.pozicio_tipus = 'operativ' THEN l.megjelent + l.tappenz + l.szabadsag ELSE 0 END) AS prodBrutto,
          -- Nem produktív (műszakvezető, gyártásszervező, stb - kivéve MEÓ)
          SUM(CASE WHEN l.pozicio_tipus = 'nem_operativ' AND l.pozicio != 'Minőségellenőr' THEN l.megjelent ELSE 0 END) AS nemProdMegjelent,
          -- MEÓ külön
          SUM(CASE WHEN l.pozicio = 'Minőségellenőr' THEN l.megjelent ELSE 0 END) AS meoMegjelent,
          -- Becsült leadás (produktív létszám * 480 perc)
          SUM(CASE WHEN l.pozicio_tipus = 'operativ' THEN l.megjelent * 480 ELSE 0 END) AS becsultLeadasPerc
        FROM ainova_letszam l
        WHERE l.datum >= DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE))
        GROUP BY l.datum, l.muszak
        ORDER BY l.datum DESC, l.muszak
      `);

    // Heti összesítés CTE-vel (a napi műszak adatokból számolva)
    const weeklyResult = await pool.request()
      .input('daysBack', sql.Int, daysBack)
      .query(`
        ;WITH NapiMuszak AS (
          SELECT 
            l.datum,
            l.muszak,
            DATEPART(ISO_WEEK, l.datum) AS hetSzam,
            DATEPART(YEAR, l.datum) AS ev,
            SUM(CASE WHEN l.pozicio_tipus = 'operativ' THEN l.megjelent ELSE 0 END) AS prodLetszam,
            SUM(CASE WHEN l.pozicio = 'Minőségellenőr' THEN l.megjelent ELSE 0 END) AS meoLetszam
          FROM ainova_letszam l
          WHERE l.datum >= DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE))
          GROUP BY l.datum, l.muszak, DATEPART(ISO_WEEK, l.datum), DATEPART(YEAR, l.datum)
        )
        SELECT 
          ev,
          hetSzam,
          MIN(datum) AS hetKezdes,
          MAX(datum) AS hetVege,
          COUNT(DISTINCT datum) AS napokSzama,
          COUNT(*) AS muszakokSzama,
          AVG(CAST(prodLetszam AS FLOAT)) AS atlagProdLetszam,
          AVG(CAST(meoLetszam AS FLOAT)) AS atlagMeoLetszam,
          SUM(CASE WHEN meoLetszam = 0 THEN 1 ELSE 0 END) AS meoNelkuliMuszakok,
          SUM(prodLetszam * 480) AS osszBecsultLeadasPerc
        FROM NapiMuszak
        GROUP BY ev, hetSzam
        ORDER BY ev DESC, hetSzam DESC
      `);

    return NextResponse.json({
      success: true,
      period,
      data: result.recordset,
      weekly: weeklyResult.recordset,
    });

  } catch (error) {
    return ApiErrors.internal(error, 'Kimutatás API');
  }
}
