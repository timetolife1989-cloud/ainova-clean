// =====================================================
// AINOVA - Teljesítmény Import API (LAC szerelők)
// =====================================================
// Purpose: Excel fájl olvasása és LAC B/C műszak adatok importálása
// Method: POST - import indítása
// Method: GET - import státusz / utolsó import info
// =====================================================
// Logika:
// 1. "Filter létszám" fül: LAC operátorok azonosítása (F1L + B/L vagy C/L)
// 2. "Percek" fül: napi percek olvasása
// 3. Csak >0 perces napok számítanak (0 = nem dolgozott)
// 4. 480 perc = 100% teljesítmény
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { validateSession } from '@/lib/auth';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { TELJESITMENY_EXCEL_PATH, SHEET_FILTER_LETSZAM, SHEET_PERCEK, IMPORT_LOCK_TIMEOUT_MINUTES, DAILY_TARGET_MINUTES, IMPORT_LOOKBACK_DAYS } from '@/lib/constants';

export const runtime = 'nodejs';

// LAC operátor interface
interface LacOperator {
  muszak: string;      // B vagy C (tisztított)
  vsz: string;         // törzsszám
  nev: string;         // név
  munkaterulet: string; // F1L
}

// Excel dátum number konvertálás - UTC-ben hogy ne legyen timezone eltolódás
function excelDateToJSDate(excelDate: number): Date {
  // UTC-ben hozzuk létre
  const utcDate = new Date(Date.UTC(1899, 11, 30));
  utcDate.setUTCDate(utcDate.getUTCDate() + excelDate);
  return utcDate;
}

// Dátum parsing az Excel header-ből (pl. "2025.12.14") - UTC-ben
function parseExcelDate(header: string): Date | null {
  if (!header) return null;
  const match = String(header).match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (match) {
    // UTC-ben hozzuk létre hogy ne legyen timezone eltolódás!
    return new Date(Date.UTC(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])));
  }
  return null;
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
        COUNT(DISTINCT torzsszam) as unique_operators,
        COUNT(DISTINCT datum) as unique_days,
        MIN(datum) as min_datum,
        MAX(datum) as max_datum,
        MAX(imported_at) as last_import
      FROM ainova_teljesitmeny
    `);

    return NextResponse.json({
      success: true,
      stats: stats.recordset[0] || null,
      excelPath: TELJESITMENY_EXCEL_PATH,
    });

  } catch (error: any) {
    console.error('[Teljesítmény Import API] GET Error:', error);
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
    // LOCK CHECK - Van már valaki aki importál?
    // =====================================================
    const lockCheck = await pool.request().query(`
      SELECT is_importing, import_started_at, last_import_at
      FROM ainova_import_status 
      WHERE import_type = 'teljesitmeny'
    `);

    if (lockCheck.recordset.length > 0) {
      const status = lockCheck.recordset[0];
      
      // Ha valaki importál és nem régebbi IMPORT_LOCK_TIMEOUT_MINUTES percnél
      if (status.is_importing && status.import_started_at) {
        const lockAge = (Date.now() - new Date(status.import_started_at).getTime()) / 1000 / 60;
        if (lockAge < IMPORT_LOCK_TIMEOUT_MINUTES) {
          console.log('[Teljesítmény Import] Skipped - another import in progress');
          return NextResponse.json({
            success: true,
            skipped: true,
            reason: 'import_in_progress',
            message: 'Másik import folyamatban, kihagyva',
          });
        }
      }

      // Ma már volt import és 12:00 után vagyunk?
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastImport = status.last_import_at ? new Date(status.last_import_at) : null;
      const wasImportedToday = lastImport && lastImport >= today;
      const isAfterNoon = now.getHours() >= 12;

      if (wasImportedToday && isAfterNoon) {
        console.log('[Teljesítmény Import] Skipped - already imported today after noon');
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'already_imported_today',
          message: 'Ma már volt import, nem szükséges újra',
          lastImportAt: status.last_import_at,
        });
      }
    }

    // =====================================================
    // LOCK ACQUIRE - Jelezzük hogy mi importálunk
    // =====================================================
    await pool.request()
      .input('user', sql.NVarChar, session.username || 'system')
      .query(`
        IF EXISTS (SELECT 1 FROM ainova_import_status WHERE import_type = 'teljesitmeny')
          UPDATE ainova_import_status 
          SET is_importing = 1, import_started_at = GETDATE(), last_import_by = @user
          WHERE import_type = 'teljesitmeny'
        ELSE
          INSERT INTO ainova_import_status (import_type, is_importing, import_started_at, last_import_by)
          VALUES ('teljesitmeny', 1, GETDATE(), @user)
      `);
    lockAcquired = true;

    console.log('[Teljesítmény Import] Starting import from:', TELJESITMENY_EXCEL_PATH);

    // =====================================================
    // 1. Excel fájl beolvasása
    // =====================================================
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(TELJESITMENY_EXCEL_PATH);
      console.log('[Teljesítmény Import] File read successfully, size:', fileBuffer.length);
    } catch (fsError: any) {
      console.error('[Teljesítmény Import] File read error:', fsError);
      return NextResponse.json({
        success: false,
        error: 'Excel fájl nem elérhető',
        details: `Hiba: ${fsError.message}`,
        path: TELJESITMENY_EXCEL_PATH,
      }, { status: 404 });
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Ellenőrizzük a szükséges füleket
    if (!workbook.SheetNames.includes(SHEET_FILTER_LETSZAM)) {
      return NextResponse.json({
        success: false,
        error: `"${SHEET_FILTER_LETSZAM}" munkalap nem található`,
        availableSheets: workbook.SheetNames,
      }, { status: 400 });
    }

    if (!workbook.SheetNames.includes(SHEET_PERCEK)) {
      return NextResponse.json({
        success: false,
        error: `"${SHEET_PERCEK}" munkalap nem található`,
        availableSheets: workbook.SheetNames,
      }, { status: 400 });
    }

    // =====================================================
    // 2. "Filter létszám" fül feldolgozása - LAC operátorok
    // =====================================================
    // Oszlopok a makró alapján:
    // A oszlop: Műszak (A/L, B/L, C/L)
    // B oszlop: VSZ (törzsszám)
    // E oszlop: Név
    // L oszlop: Munkaterület kód (F1L = LAC)
    // =====================================================

    const filterSheet = workbook.Sheets[SHEET_FILTER_LETSZAM];
    const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 }) as any[][];

    const lacOperators: Map<string, LacOperator> = new Map();

    // Header keresése
    let filterHeaderRow = -1;
    for (let i = 0; i < Math.min(5, filterData.length); i++) {
      const row = filterData[i];
      if (row && row.some((cell: any) => String(cell).toUpperCase().includes('MŰSZAK'))) {
        filterHeaderRow = i;
        break;
      }
    }

    console.log('[Teljesítmény Import] Filter létszám header row:', filterHeaderRow);

    // Adatok feldolgozása (1. sortól vagy header+1-től)
    const startRow = filterHeaderRow >= 0 ? filterHeaderRow + 1 : 1;

    for (let i = startRow; i < filterData.length; i++) {
      const row = filterData[i];
      if (!row) continue;

      // Oszlop indexek (0-based): A=0, B=1, E=4, L=11
      const muszakRaw = String(row[0] || '').trim().toUpperCase();
      const vsz = String(row[1] || '').trim();
      const nev = String(row[4] || '').trim();
      const munkaterulet = String(row[11] || '').trim().toUpperCase();

      // Csak LAC (F1L) operátorok kellenek
      if (munkaterulet !== 'F1L') continue;

      // Csak A/L, B/L és C/L műszakok (LAC)
      if (muszakRaw !== 'A/L' && muszakRaw !== 'B/L' && muszakRaw !== 'C/L') continue;

      // Érvényes törzsszám
      if (!vsz || vsz.length < 5) continue;

      // Műszak tisztítása: A/L -> A, B/L -> B, C/L -> C
      const muszak = muszakRaw.replace('/L', '');

      lacOperators.set(vsz, {
        muszak,
        vsz,
        nev,
        munkaterulet,
      });
    }

    console.log(`[Teljesítmény Import] Found ${lacOperators.size} LAC operators`);

    if (lacOperators.size === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nem találtam LAC operátorokat a "Filter létszám" fülön',
        hint: 'Ellenőrizd: A oszlop = A/L, B/L vagy C/L, L oszlop = F1L',
      }, { status: 400 });
    }

    // =====================================================
    // 3. "Percek" fül feldolgozása
    // =====================================================
    const percekSheet = workbook.Sheets[SHEET_PERCEK];
    const percekData = XLSX.utils.sheet_to_json(percekSheet, { header: 1 }) as any[][];

    // Header sor keresése (MŰSZAK, Név, VSZ)
    let headerRowIndex = -1;
    let colMuszak = -1, colNev = -1, colVsz = -1;

    for (let i = 0; i < Math.min(10, percekData.length); i++) {
      const row = percekData[i];
      if (!row) continue;

      for (let j = 0; j < Math.min(20, row.length); j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell === 'MŰSZAK') colMuszak = j;
        if (cell === 'NÉV') colNev = j;
        if (cell === 'VSZ') colVsz = j;
      }

      if (colMuszak >= 0 && colNev >= 0 && colVsz >= 0) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex < 0) {
      return NextResponse.json({
        success: false,
        error: 'Nem találom a header sort a "Percek" fülön (MŰSZAK, Név, VSZ oszlopok)',
      }, { status: 400 });
    }

    console.log(`[Teljesítmény Import] Percek header at row ${headerRowIndex}, columns: MŰSZAK=${colMuszak}, NÉV=${colNev}, VSZ=${colVsz}`);

    // Dátum oszlopok megtalálása (VSZ után)
    const headerRow = percekData[headerRowIndex];
    const dateColumns: { col: number; date: Date }[] = [];

    for (let j = colVsz + 1; j < headerRow.length; j++) {
      const cellValue = headerRow[j];
      let date: Date | null = null;

      if (typeof cellValue === 'number') {
        date = excelDateToJSDate(cellValue);
      } else if (typeof cellValue === 'string') {
        date = parseExcelDate(cellValue);
      }

      if (date && !isNaN(date.getTime())) {
        dateColumns.push({ col: j, date });
      }
    }

    console.log(`[Teljesítmény Import] Found ${dateColumns.length} date columns`);

    // =====================================================
    // 4. DB kapcsolat és meglévő rekordok
    // =====================================================
    // pool már fentebb inicializálva van

    // Számítsuk ki a lookback dátumot - ennél régebbi adatokat nem UPDATE-elünk
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - IMPORT_LOOKBACK_DAYS);
    const lookbackDateStr = lookbackDate.toISOString().split('T')[0];
    console.log(`[Teljesítmény Import] Lookback date (will update if newer): ${lookbackDateStr}`);

    const existingResult = await pool.request().query(`
      SELECT DISTINCT CONVERT(VARCHAR, datum, 23) as datum, muszak, torzsszam, leadott_perc
      FROM ainova_teljesitmeny
    `);

    // Map: key -> existing record (for update detection)
    const existingRecords = new Map<string, { perc: number; datum: string }>();
    for (const r of existingResult.recordset as { datum: string; muszak: string; torzsszam: string; leadott_perc: number }[]) {
      const key = `${r.datum}_${r.muszak}_${r.torzsszam}`;
      existingRecords.set(key, { perc: r.leadott_perc, datum: r.datum });
    }

    // =====================================================
    // 5. Operátorok szinkronizálása az ainova_operatorok táblába
    // =====================================================
    let syncedOperators = 0;
    for (const [vsz, op] of lacOperators) {
      try {
        await pool.request()
          .input('torzsszam', sql.NVarChar(50), vsz)
          .input('nev', sql.NVarChar(100), op.nev)
          .input('muszak', sql.NVarChar(10), op.muszak)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM ainova_operatorok WHERE torzsszam = @torzsszam)
              INSERT INTO ainova_operatorok (torzsszam, nev, muszak, pozicio, aktiv)
              VALUES (@torzsszam, @nev, @muszak, 'Admin adja meg', 1)
            ELSE
              UPDATE ainova_operatorok 
              SET nev = @nev, muszak = @muszak
              WHERE torzsszam = @torzsszam
          `);
        syncedOperators++;
      } catch (syncErr: any) {
        console.error('[Teljesítmény Import] Operator sync error:', syncErr.message);
      }
    }
    console.log(`[Teljesítmény Import] Synced ${syncedOperators} operators to ainova_operatorok`);

    // =====================================================
    // 6. Adatok feldolgozása (UPSERT logika)
    // =====================================================
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let notLac = 0;
    let zeroSkipped = 0;

    for (let i = headerRowIndex + 1; i < percekData.length; i++) {
      const row = percekData[i];
      if (!row) continue;

      const vsz = String(row[colVsz] || '').trim();
      
      // Csak LAC operátorok!
      const operator = lacOperators.get(vsz);
      if (!operator) {
        notLac++;
        continue;
      }

      const nev = operator.nev || String(row[colNev] || '').trim();
      const muszak = operator.muszak;

      // Minden dátum oszlopra
      for (const { col, date } of dateColumns) {
        const percValue = row[col];
        
        // Üres cella = skip
        if (percValue === undefined || percValue === null || percValue === '') continue;

        const perc = typeof percValue === 'number' 
          ? Math.round(percValue) 
          : parseInt(String(percValue).replace(',', '.')) || 0;

        // 0 perc = nem dolgozott azon a napon -> SKIP
        if (perc === 0) {
          zeroSkipped++;
          continue;
        }

        const datumStr = date.toISOString().split('T')[0];
        const key = `${datumStr}_${muszak}_${vsz}`;

        const existing = existingRecords.get(key);
        
        // Ha létezik a rekord
        if (existing) {
          // Ha a dátum a lookback perióduson belül van ÉS az érték változott → UPDATE
          if (datumStr >= lookbackDateStr && existing.perc !== perc) {
            try {
              await pool.request()
                .input('datum', sql.Date, date)
                .input('muszak', sql.NVarChar, muszak)
                .input('torzsszam', sql.NVarChar, vsz)
                .input('nev', sql.NVarChar, nev)
                .input('leadott_perc', sql.Int, perc)
                .query(`
                  UPDATE ainova_teljesitmeny 
                  SET leadott_perc = @leadott_perc, nev = @nev, imported_at = GETDATE()
                  WHERE datum = @datum AND muszak = @muszak AND torzsszam = @torzsszam
                `);
              updated++;
              existingRecords.set(key, { perc, datum: datumStr });
            } catch (err: any) {
              errors++;
              console.error('[Teljesítmény Import] Update error:', err.message);
            }
          } else {
            // Régebbi adat vagy nem változott → skip
            skipped++;
          }
          continue;
        }

        // Új rekord → INSERT
        try {
          await pool.request()
            .input('datum', sql.Date, date)
            .input('muszak', sql.NVarChar, muszak)
            .input('torzsszam', sql.NVarChar, vsz)
            .input('nev', sql.NVarChar, nev)
            .input('leadott_perc', sql.Int, perc)
            .query(`
              INSERT INTO ainova_teljesitmeny (datum, muszak, torzsszam, nev, leadott_perc)
              VALUES (@datum, @muszak, @torzsszam, @nev, @leadott_perc)
            `);

          inserted++;
          existingRecords.set(key, { perc, datum: datumStr });
        } catch (err: any) {
          if (err.number === 2627 || err.number === 2601) {
            skipped++;
          } else {
            errors++;
            console.error('[Teljesítmény Import] Insert error:', err.message);
          }
        }
      }
    }

    console.log(`[Teljesítmény Import] Complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${zeroSkipped} zero-perc skipped, ${notLac} not-LAC, ${errors} errors`);

    // =====================================================
    // LOCK RELEASE + STATUS UPDATE
    // =====================================================
    if (lockAcquired && pool) {
      await pool.request()
        .input('records', sql.Int, inserted + updated)
        .query(`
          UPDATE ainova_import_status 
          SET is_importing = 0, 
              last_import_at = GETDATE(), 
              records_imported = @records,
              import_started_at = NULL
          WHERE import_type = 'teljesitmeny'
        `);
    }

    return NextResponse.json({
      success: true,
      message: 'Import sikeres',
      stats: {
        inserted,
        updated,
        skipped,
        zeroSkipped,
        notLac,
        errors,
        lacOperatorsFound: lacOperators.size,
        syncedOperators,
        dateColumnsFound: dateColumns.length,
        lookbackDays: IMPORT_LOOKBACK_DAYS,
      },
    });

  } catch (error: any) {
    console.error('[Teljesítmény Import API] POST Error:', error);
    
    // LOCK RELEASE on error
    if (lockAcquired && pool) {
      try {
        await pool.request().query(`
          UPDATE ainova_import_status 
          SET is_importing = 0, import_started_at = NULL
          WHERE import_type = 'teljesitmeny'
        `);
      } catch (unlockErr) {
        console.error('[Teljesítmény Import] Failed to release lock:', unlockErr);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Import hiba', details: error.message },
      { status: 500 }
    );
  }
}
