// =====================================================
// AINOVA - Napi Perces Import API
// =====================================================
// Purpose: Excel fájl olvasása és napi percek importálása
// Method: POST - import indítása
// Method: GET - import státusz / utolsó import info
// =====================================================
// Oszlopok:
// A: Dátum, M: Cél, N: Lehívott Siemens DC, O: Lehívott No Siemens
// U: Leadott Siemens DC, V: Leadott No Siemens, W: Leadott Kaco
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { validateSession } from '@/lib/auth';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { NAPI_PERCES_EXCEL_PATH, NAPI_PERCES_COLS, IMPORT_LOCK_TIMEOUT_MINUTES } from '@/lib/constants';

export const runtime = 'nodejs';

// Hónap nevek (fül nevek) - új formátum: 2026-Jan., 2026-Feb stb.
const HONAP_NEVEK_ROVIDITES = [
  'Jan', 'Feb', 'Márc', 'Ápr', 'Máj', 'Jún',
  'Júl', 'Aug', 'Szept', 'Okt', 'Nov', 'Dec'
];
// Régi magyar nevek backup
const HONAP_NEVEK_MAGYAR = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december'
];

// Excel dátum number konvertálás
function excelDateToJSDate(excelDate: number): Date | null {
  if (!excelDate || excelDate < 1) return null;
  const utcDate = new Date(Date.UTC(1899, 11, 30));
  utcDate.setUTCDate(utcDate.getUTCDate() + excelDate);
  return utcDate;
}

// Szám kiolvasása cellából
function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : Math.round(num);
}

// =====================================================
// GET - Import státusz
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const pool = await getPool();

    // Összesített statisztikák
    const stats = await pool.request().query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT datum) as unique_days,
        MIN(datum) as min_datum,
        MAX(datum) as max_datum,
        (SELECT last_import_at FROM ainova_napi_perces_import_status WHERE import_type = 'napi_perces') as last_import
      FROM ainova_napi_perces
    `);

    return NextResponse.json({
      success: true,
      stats: stats.recordset[0] || null,
      excelPath: NAPI_PERCES_EXCEL_PATH,
    });

  } catch (error: any) {
    console.error('[Napi Perces Import API] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Hiba történt', details: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Import futtatása
// =====================================================
export async function POST(request: NextRequest) {
  let lockAcquired = false;
  let pool: any = null;

  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    pool = await getPool();

    // =====================================================
    // LOCK CHECK
    // =====================================================
    const lockCheck = await pool.request().query(`
      SELECT is_importing, import_started_at, last_import_at
      FROM ainova_napi_perces_import_status 
      WHERE import_type = 'napi_perces'
    `);

    if (lockCheck.recordset.length > 0) {
      const status = lockCheck.recordset[0];
      
      if (status.is_importing && status.import_started_at) {
        const lockAge = (Date.now() - new Date(status.import_started_at).getTime()) / 1000 / 60;
        if (lockAge < IMPORT_LOCK_TIMEOUT_MINUTES) {
          return NextResponse.json({
            success: true,
            skipped: true,
            reason: 'import_in_progress',
            message: 'Másik import folyamatban',
          });
        }
      }
    }

    // =====================================================
    // LOCK ACQUIRE
    // =====================================================
    await pool.request()
      .input('user', sql.NVarChar, session.username || 'system')
      .query(`
        IF EXISTS (SELECT 1 FROM ainova_napi_perces_import_status WHERE import_type = 'napi_perces')
          UPDATE ainova_napi_perces_import_status 
          SET is_importing = 1, import_started_at = GETDATE(), last_import_by = @user
          WHERE import_type = 'napi_perces'
        ELSE
          INSERT INTO ainova_napi_perces_import_status (import_type, is_importing, import_started_at, last_import_by)
          VALUES ('napi_perces', 1, GETDATE(), @user)
      `);
    lockAcquired = true;

    console.log('[Napi Perces Import] Starting import from:', NAPI_PERCES_EXCEL_PATH);

    // =====================================================
    // 1. Excel fájl beolvasása
    // =====================================================
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(NAPI_PERCES_EXCEL_PATH);
      console.log('[Napi Perces Import] File read successfully, size:', fileBuffer.length);
    } catch (fsError: any) {
      console.error('[Napi Perces Import] File read error:', fsError);
      return NextResponse.json({
        success: false,
        error: 'Excel fájl nem elérhető',
        details: `Hiba: ${fsError.message}`,
        path: NAPI_PERCES_EXCEL_PATH,
      }, { status: 404 });
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // =====================================================
    // 1.5 Tábla ürítése (teljes újraimport)
    // =====================================================
    await pool.request().query('DELETE FROM ainova_napi_perces');
    console.log('[Napi Perces Import] Table cleared for fresh import');

    // =====================================================
    // 2. DINAMIKUS IMPORT - Az aktuális dátum alapján
    // =====================================================
    // Logika:
    // 1. Meghatározzuk az aktuális évet és hónapot
    // 2. Megkeressük az Excel füleket ami az aktuális évvel kezdődik (pl. "2026-Jan.")
    // 3. Feldolgozzuk az aktuális hónap fülét + előző hónapét (ha ugyanaz az év)
    // 4. Csak a tegnapi napig importálunk (< mai nap)
    // 5. Csak olyan sorokat ahol van leadott adat
    // =====================================================
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const now = new Date();
    const currentYear = now.getFullYear();  // pl. 2026
    const currentMonth = now.getMonth();    // 0-based: január = 0

    console.log('[Napi Perces Import] Available sheets:', workbook.SheetNames);
    console.log(`[Napi Perces Import] Current date: ${currentYear}.${String(currentMonth + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`);

    // Keressük meg az aktuális évhez tartozó füleket
    // Formátum: "2026-Jan.", "2026-Feb", stb.
    const currentYearSheets = workbook.SheetNames.filter(name => 
      name.includes(String(currentYear))
    );
    
    console.log(`[Napi Perces Import] Sheets for year ${currentYear}:`, currentYearSheets);

    // Ha nincs aktuális éves fül, próbáljuk a magyar hónap nevekkel
    let sheetsToProcess: string[] = [];
    
    if (currentYearSheets.length > 0) {
      // Van évszámos fül - feldolgozzuk az aktuális hónapot
      const currentMonthShort = HONAP_NEVEK_ROVIDITES[currentMonth];
      const currentMonthSheet = currentYearSheets.find(name => 
        name.toLowerCase().includes(currentMonthShort.toLowerCase())
      );
      
      if (currentMonthSheet) {
        sheetsToProcess.push(currentMonthSheet);
      }
      
      // Előző hónap fül (ha ugyanaz az év)
      if (currentMonth > 0) {
        const prevMonthShort = HONAP_NEVEK_ROVIDITES[currentMonth - 1];
        const prevMonthSheet = currentYearSheets.find(name => 
          name.toLowerCase().includes(prevMonthShort.toLowerCase())
        );
        if (prevMonthSheet) {
          sheetsToProcess.push(prevMonthSheet);
        }
      }
    } else {
      // Nincs évszámos fül - régi formátum (pl. "január")
      const currentMonthLong = HONAP_NEVEK_MAGYAR[currentMonth];
      const currentMonthSheet = workbook.SheetNames.find(name => 
        name.toLowerCase().includes(currentMonthLong.toLowerCase())
      );
      if (currentMonthSheet) {
        sheetsToProcess.push(currentMonthSheet);
      }
    }

    console.log('[Napi Perces Import] Sheets to process:', sheetsToProcess);

    // Feldolgozzuk a kiválasztott füleket
    for (const sheetName of sheetsToProcess) {
      console.log(`[Napi Perces Import] Processing sheet: ${sheetName}`);
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Sorok feldolgozása (1. sortól, header kihagyása ha kell)
      for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx];
        if (!row || row.length === 0) continue;

        // Dátum kiolvasása
        const datumRaw = row[NAPI_PERCES_COLS.DATUM];
        let datum: Date | null = null;
        
        if (typeof datumRaw === 'number') {
          datum = excelDateToJSDate(datumRaw);
        } else if (typeof datumRaw === 'string') {
          // Próbáljuk parse-olni: 2026.01.05 formátum
          const match = datumRaw.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
          if (match) {
            datum = new Date(Date.UTC(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])));
          }
        }

        if (!datum || isNaN(datum.getTime())) {
          continue; // Nem érvényes dátum, kihagyás
        }

        // =====================================================
        // DINAMIKUS ÉV SZŰRÉS
        // Csak az aktuális év adatait importáljuk
        // Ha 2026-ban vagyunk, csak 2026-os dátumokat
        // Ha 2027-ben leszünk, csak 2027-es dátumokat
        // =====================================================
        if (datum.getFullYear() !== currentYear) {
          skipped++;
          continue;
        }

        // Mai napot és jövőt kihagyjuk (csak befejezett napok)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (datum >= today) {
          skipped++;
          continue;
        }

        // Adatok kiolvasása
        const cel = parseNumber(row[NAPI_PERCES_COLS.CEL]);
        const lehivottSiemens = parseNumber(row[NAPI_PERCES_COLS.LEHIVOTT_SIEMENS]);
        const lehivottNoSiemens = parseNumber(row[NAPI_PERCES_COLS.LEHIVOTT_NO_SIEMENS]);
        const lehivottOssz = lehivottSiemens + lehivottNoSiemens;
        const leadottSiemens = parseNumber(row[NAPI_PERCES_COLS.LEADOTT_SIEMENS]);
        const leadottNoSiemens = parseNumber(row[NAPI_PERCES_COLS.LEADOTT_NO_SIEMENS]);
        const leadottKaco = parseNumber(row[NAPI_PERCES_COLS.LEADOTT_KACO]);
        const leadottOssz = leadottSiemens + leadottNoSiemens + leadottKaco;

        // Ha nincs leadott adat, kihagyjuk (még nincs kész a nap)
        if (leadottOssz === 0) {
          skipped++;
          continue;
        }

        // UPSERT
        try {
          const datumStr = datum.toISOString().split('T')[0];
          
          const result = await pool.request()
            .input('datum', sql.Date, datumStr)
            .input('cel_perc', sql.Int, cel)
            .input('lehivott_siemens_dc', sql.Int, lehivottSiemens)
            .input('lehivott_no_siemens', sql.Int, lehivottNoSiemens)
            .input('lehivott_ossz', sql.Int, lehivottOssz)
            .input('leadott_siemens_dc', sql.Int, leadottSiemens)
            .input('leadott_no_siemens', sql.Int, leadottNoSiemens)
            .input('leadott_kaco', sql.Int, leadottKaco)
            .input('leadott_ossz', sql.Int, leadottOssz)
            .query(`
              IF EXISTS (SELECT 1 FROM ainova_napi_perces WHERE datum = @datum)
              BEGIN
                UPDATE ainova_napi_perces SET
                  cel_perc = @cel_perc,
                  lehivott_siemens_dc = @lehivott_siemens_dc,
                  lehivott_no_siemens = @lehivott_no_siemens,
                  lehivott_ossz = @lehivott_ossz,
                  leadott_siemens_dc = @leadott_siemens_dc,
                  leadott_no_siemens = @leadott_no_siemens,
                  leadott_kaco = @leadott_kaco,
                  leadott_ossz = @leadott_ossz,
                  imported_at = GETDATE()
                WHERE datum = @datum;
                SELECT 'updated' AS action;
              END
              ELSE
              BEGIN
                INSERT INTO ainova_napi_perces 
                  (datum, cel_perc, lehivott_siemens_dc, lehivott_no_siemens, lehivott_ossz,
                   leadott_siemens_dc, leadott_no_siemens, leadott_kaco, leadott_ossz)
                VALUES 
                  (@datum, @cel_perc, @lehivott_siemens_dc, @lehivott_no_siemens, @lehivott_ossz,
                   @leadott_siemens_dc, @leadott_no_siemens, @leadott_kaco, @leadott_ossz);
                SELECT 'inserted' AS action;
              END
            `);

          if (result.recordset[0]?.action === 'inserted') {
            inserted++;
          } else {
            updated++;
          }
        } catch (dbErr: any) {
          console.error('[Napi Perces Import] DB error:', dbErr.message);
          errors++;
        }
      }
    }

    // =====================================================
    // LOCK RELEASE + státusz frissítés
    // =====================================================
    await pool.request()
      .input('records', sql.Int, inserted + updated)
      .query(`
        UPDATE ainova_napi_perces_import_status 
        SET is_importing = 0, 
            last_import_at = GETDATE(),
            records_imported = @records
        WHERE import_type = 'napi_perces'
      `);
    lockAcquired = false;

    console.log(`[Napi Perces Import] Completed: inserted=${inserted}, updated=${updated}, skipped=${skipped}, errors=${errors}`);

    return NextResponse.json({
      success: true,
      imported: inserted + updated,
      inserted,
      updated,
      skipped,
      errors,
    });

  } catch (error: any) {
    console.error('[Napi Perces Import API] POST Error:', error);

    // Lock felszabadítása hiba esetén
    if (lockAcquired && pool) {
      try {
        await pool.request().query(`
          UPDATE ainova_napi_perces_import_status 
          SET is_importing = 0 
          WHERE import_type = 'napi_perces'
        `);
      } catch (e) {
        console.error('[Napi Perces Import] Lock release error:', e);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Import hiba', details: error.message },
      { status: 500 }
    );
  }
}
