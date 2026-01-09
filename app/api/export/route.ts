// =====================================================
// AINOVA - Excel Export API
// =====================================================
// Purpose: Adatok exportálása Excel formátumba
// Method: POST
// Body: { type: 'teljesitmeny' | 'letszam', period, filters }
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const body = await request.json();
    const { type, period = 'heti', muszak } = body;

    const pool = await getPool();

    let daysBack = 7;
    if (period === 'heti') daysBack = 28;
    if (period === 'havi') daysBack = 90;

    let data: any[] = [];
    let sheetName = 'Export';

    switch (type) {
      case 'teljesitmeny':
        // Teljesítmény adatok exportálása
        const teljesitmenyResult = await pool.request()
          .input('daysBack', sql.Int, daysBack)
          .input('muszakFilter', sql.NVarChar, muszak || '')
          .query(`
            SELECT 
              FORMAT(datum, 'yyyy-MM-dd') AS Dátum,
              muszak AS Műszak,
              torzsszam AS Törzsszám,
              nev AS Név,
              leadott_perc AS [Leadott perc],
              szazalek AS [Teljesítmény %]
            FROM ainova_teljesitmeny
            WHERE datum >= DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE))
              AND (@muszakFilter = '' OR muszak = @muszakFilter)
            ORDER BY datum DESC, muszak, nev
          `);
        data = teljesitmenyResult.recordset;
        sheetName = 'Teljesítmény';
        break;

      case 'teljesitmeny-muszak':
        // Műszak összesítés exportálása
        const muszakResult = await pool.request()
          .input('daysBack', sql.Int, daysBack)
          .query(`
            SELECT 
              FORMAT(datum, 'yyyy-MM-dd') AS Dátum,
              muszak AS Műszak,
              COUNT(*) AS Létszám,
              SUM(leadott_perc) AS [Össz perc],
              ROUND(AVG(CAST(leadott_perc AS FLOAT)), 1) AS [Átlag perc/fő],
              ROUND(AVG(szazalek), 1) AS [Átlag %],
              ROUND(CAST(SUM(leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * 480, 0) * 100, 1) AS [Műszak %]
            FROM ainova_teljesitmeny
            WHERE datum >= DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE))
            GROUP BY datum, muszak
            ORDER BY datum DESC, muszak
          `);
        data = muszakResult.recordset;
        sheetName = 'Műszak összesítés';
        break;

      case 'teljesitmeny-operator':
        // Operátor összesítés exportálása
        const operatorResult = await pool.request()
          .input('daysBack', sql.Int, daysBack)
          .input('muszakFilter', sql.NVarChar, muszak || '')
          .query(`
            SELECT 
              torzsszam AS Törzsszám,
              nev AS Név,
              muszak AS Műszak,
              COUNT(*) AS Munkanapok,
              SUM(leadott_perc) AS [Össz perc],
              ROUND(AVG(CAST(leadott_perc AS FLOAT)), 1) AS [Átlag perc],
              ROUND(AVG(szazalek), 1) AS [Átlag %],
              ROUND(MIN(szazalek), 1) AS [Min %],
              ROUND(MAX(szazalek), 1) AS [Max %]
            FROM ainova_teljesitmeny
            WHERE datum >= DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE))
              AND (@muszakFilter = '' OR muszak = @muszakFilter)
            GROUP BY torzsszam, nev, muszak
            ORDER BY [Átlag %] DESC
          `);
        data = operatorResult.recordset;
        sheetName = 'Operátor összesítés';
        break;

      case 'letszam':
        // Létszám adatok exportálása
        const letszamResult = await pool.request()
          .input('daysBack', sql.Int, daysBack)
          .query(`
            SELECT 
              FORMAT(datum, 'yyyy-MM-dd') AS Dátum,
              muszak AS Műszak,
              pozicio AS Pozíció,
              pozicio_tipus AS Típus,
              megjelent AS Megjelent,
              tappenz AS Táppénz,
              szabadsag AS Szabadság,
              megjelent + tappenz + szabadsag AS [Bruttó létszám]
            FROM ainova_letszam
            WHERE datum >= DATEADD(DAY, -@daysBack, CAST(GETDATE() AS DATE))
            ORDER BY datum DESC, muszak, pozicio
          `);
        data = letszamResult.recordset;
        sheetName = 'Létszám';
        break;

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nincs exportálható adat a megadott időszakban' 
      }, { status: 404 });
    }

    // Excel létrehozása
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Oszlop szélességek automatikus beállítása
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, 12)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Excel buffer létrehozása
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Fájlnév generálása
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `AINOVA_${type}_${dateStr}.xlsx`;

    // Response küldése
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    return ApiErrors.internal(error, 'Export API');
  }
}
