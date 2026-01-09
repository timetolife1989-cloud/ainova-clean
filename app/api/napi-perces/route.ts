// =====================================================
// AINOVA - Napi Perces Kimutatás API
// =====================================================
// Purpose: Napi percek statisztikák lekérése
// Method: GET
// Query: type=napi|heti|havi, offset=0
// Auto-import: Automatikusan frissíti az adatokat ha szükséges
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { NAPI_PERCES_EXCEL_PATH, NAPI_PERCES_COLS } from '@/lib/constants';

export const runtime = 'nodejs';

// Hónap rövidítések
const HONAP_NEVEK_ROVIDITES = ['Jan', 'Feb', 'Márc', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szept', 'Okt', 'Nov', 'Dec'];
const HONAP_NEVEK_MAGYAR = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];

// Excel dátum konvertálás
function excelDateToJSDate(excelDate: number): Date | null {
  if (!excelDate || excelDate < 1) return null;
  const utcDate = new Date(Date.UTC(1899, 11, 30));
  utcDate.setUTCDate(utcDate.getUTCDate() + excelDate);
  return utcDate;
}

function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
  return isNaN(num) ? 0 : Math.round(num);
}

// =====================================================
// Háttér import - gyors és automatikus
// =====================================================
async function autoImportIfNeeded(pool: any): Promise<void> {
  try {
    // Ellenőrizzük, van-e egyáltalán adat
    const dataCheck = await pool.request().query(`SELECT COUNT(*) as cnt FROM ainova_napi_perces`);
    const hasData = dataCheck.recordset[0]?.cnt > 0;
    
    // Ellenőrizzük, mikor volt utoljára import
    const statusCheck = await pool.request().query(`
      SELECT last_import_at, is_importing 
      FROM ainova_napi_perces_import_status 
      WHERE import_type = 'napi_perces'
    `);
    
    const status = statusCheck.recordset[0];
    
    // Ha folyamatban van import, kilépünk
    if (status?.is_importing) return;
    
    // Ha VAN adat és kevesebb mint 1 órája volt import, kihagyjuk
    // Ha NINCS adat, mindenképp importálunk
    if (hasData && status?.last_import_at) {
      const lastImport = new Date(status.last_import_at);
      const now = new Date();
      const hoursSinceImport = (now.getTime() - lastImport.getTime()) / 1000 / 60 / 60;
      
      if (hoursSinceImport < 1) return;
    }
    
    // Gyors háttér import
    console.log('[Napi Perces] Auto-import starting... hasData:', hasData);
    console.log('[Napi Perces] Auto-import starting...');
    
    // Lock
    await pool.request().query(`
      IF EXISTS (SELECT 1 FROM ainova_napi_perces_import_status WHERE import_type = 'napi_perces')
        UPDATE ainova_napi_perces_import_status SET is_importing = 1, import_started_at = GETDATE() WHERE import_type = 'napi_perces'
      ELSE
        INSERT INTO ainova_napi_perces_import_status (import_type, is_importing, import_started_at) VALUES ('napi_perces', 1, GETDATE())
    `);
    
    // Excel olvasás
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(NAPI_PERCES_EXCEL_PATH);
    } catch {
      await pool.request().query(`UPDATE ainova_napi_perces_import_status SET is_importing = 0 WHERE import_type = 'napi_perces'`);
      return;
    }
    
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Csak aktuális hónap feldolgozása (gyorsabb)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const shortName = HONAP_NEVEK_ROVIDITES[currentMonth];
    
    const sheetName = workbook.SheetNames.find(name => 
      name.includes(String(currentYear)) && name.toLowerCase().includes(shortName.toLowerCase())
    ) || workbook.SheetNames.find(name => 
      name.toLowerCase().includes(shortName.toLowerCase()) || 
      name.toLowerCase().includes(HONAP_NEVEK_MAGYAR[currentMonth].toLowerCase())
    );
    
    if (!sheetName) {
      await pool.request().query(`UPDATE ainova_napi_perces_import_status SET is_importing = 0 WHERE import_type = 'napi_perces'`);
      return;
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    let imported = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length === 0) continue;
      
      const datumRaw = row[NAPI_PERCES_COLS.DATUM];
      let datum: Date | null = null;
      
      if (typeof datumRaw === 'number') {
        datum = excelDateToJSDate(datumRaw);
      } else if (typeof datumRaw === 'string') {
        const match = datumRaw.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
        if (match) datum = new Date(Date.UTC(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])));
      }
      
      if (!datum || isNaN(datum.getTime()) || datum >= today) continue;
      
      // =====================================================
      // DINAMIKUS ÉV SZŰRÉS - csak aktuális év adatai
      // 2026-ban → csak 2026-os dátumok
      // 2027-ben → csak 2027-es dátumok
      // =====================================================
      if (datum.getFullYear() !== currentYear) continue;
      
      const leadottSiemens = parseNumber(row[NAPI_PERCES_COLS.LEADOTT_SIEMENS]);
      const leadottNoSiemens = parseNumber(row[NAPI_PERCES_COLS.LEADOTT_NO_SIEMENS]);
      const leadottKaco = parseNumber(row[NAPI_PERCES_COLS.LEADOTT_KACO]);
      const leadottOssz = leadottSiemens + leadottNoSiemens + leadottKaco;
      
      if (leadottOssz === 0) continue;
      
      const cel = parseNumber(row[NAPI_PERCES_COLS.CEL]);
      const lehivottSiemens = parseNumber(row[NAPI_PERCES_COLS.LEHIVOTT_SIEMENS]);
      const lehivottNoSiemens = parseNumber(row[NAPI_PERCES_COLS.LEHIVOTT_NO_SIEMENS]);
      
      try {
        await pool.request()
          .input('datum', sql.Date, datum.toISOString().split('T')[0])
          .input('cel_perc', sql.Int, cel)
          .input('lehivott_siemens_dc', sql.Int, lehivottSiemens)
          .input('lehivott_no_siemens', sql.Int, lehivottNoSiemens)
          .input('lehivott_ossz', sql.Int, lehivottSiemens + lehivottNoSiemens)
          .input('leadott_siemens_dc', sql.Int, leadottSiemens)
          .input('leadott_no_siemens', sql.Int, leadottNoSiemens)
          .input('leadott_kaco', sql.Int, leadottKaco)
          .input('leadott_ossz', sql.Int, leadottOssz)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM ainova_napi_perces WHERE datum = @datum)
              INSERT INTO ainova_napi_perces (datum, cel_perc, lehivott_siemens_dc, lehivott_no_siemens, lehivott_ossz, leadott_siemens_dc, leadott_no_siemens, leadott_kaco, leadott_ossz)
              VALUES (@datum, @cel_perc, @lehivott_siemens_dc, @lehivott_no_siemens, @lehivott_ossz, @leadott_siemens_dc, @leadott_no_siemens, @leadott_kaco, @leadott_ossz)
          `);
        imported++;
      } catch {}
    }
    
    // Unlock + státusz
    await pool.request()
      .input('records', sql.Int, imported)
      .query(`UPDATE ainova_napi_perces_import_status SET is_importing = 0, last_import_at = GETDATE(), records_imported = @records WHERE import_type = 'napi_perces'`);
    
    console.log(`[Napi Perces] Auto-import completed: ${imported} records`);
  } catch (err) {
    console.error('[Napi Perces] Auto-import error:', err);
    try {
      await pool.request().query(`UPDATE ainova_napi_perces_import_status SET is_importing = 0 WHERE import_type = 'napi_perces'`);
    } catch {}
  }
}

export async function GET(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'napi';
    const offset = parseInt(searchParams.get('offset') || '0');

    const pool = await getPool();
    
    // Automatikus háttér import (nem blokkoló)
    autoImportIfNeeded(pool).catch(() => {});

    let result;

    switch (type) {
      case 'napi':
        // Napi kimutatás: 20 nap, lapozható
        const napiPageSize = 20;
        
        result = await pool.request()
          .input('offset', sql.Int, offset)
          .input('pageSize', sql.Int, napiPageSize)
          .query(`
            -- Mai napot kihagyjuk
            DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
            
            -- Összes nap (ahol van adat)
            DECLARE @TotalDays INT = (
              SELECT COUNT(*) FROM ainova_napi_perces WHERE datum <= @Yesterday
            );
            
            -- Lapozható range
            WITH DateRange AS (
              SELECT datum
              FROM ainova_napi_perces
              WHERE datum <= @Yesterday
              ORDER BY datum DESC
              OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            )
            SELECT 
              FORMAT(p.datum, 'MM.dd', 'hu-HU') AS datum_label,
              p.datum,
              DATENAME(WEEKDAY, p.datum) AS nap_nev,
              p.cel_perc,
              p.lehivott_siemens_dc,
              p.lehivott_no_siemens,
              p.lehivott_ossz,
              p.leadott_siemens_dc,
              p.leadott_no_siemens,
              p.leadott_kaco,
              p.leadott_ossz,
              -- Százalékok
              CASE WHEN p.cel_perc > 0 THEN CAST(p.lehivott_ossz AS FLOAT) / p.cel_perc * 100 ELSE 0 END AS lehivas_szazalek,
              CASE WHEN p.cel_perc > 0 THEN CAST(p.leadott_ossz AS FLOAT) / p.cel_perc * 100 ELSE 0 END AS leadas_szazalek,
              CASE WHEN p.lehivott_ossz > 0 THEN CAST(p.leadott_ossz AS FLOAT) / p.lehivott_ossz * 100 ELSE 0 END AS leadas_per_lehivas_szazalek,
              @TotalDays AS total_days
            FROM ainova_napi_perces p
            INNER JOIN DateRange dr ON p.datum = dr.datum
            ORDER BY p.datum ASC
          `);
        break;

      case 'heti':
        // Heti kimutatás: 12 hét, lapozható
        const hetiPageSize = 12;
        
        result = await pool.request()
          .input('offset', sql.Int, offset)
          .input('pageSize', sql.Int, hetiPageSize)
          .query(`
            -- Mai napot kihagyjuk
            DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
            
            -- Összes hét
            WITH AllWeeks AS (
              SELECT DISTINCT 
                DATEPART(YEAR, datum) AS ev,
                DATEPART(ISO_WEEK, datum) AS het
              FROM ainova_napi_perces
              WHERE datum <= @Yesterday
            ),
            TotalWeeks AS (
              SELECT COUNT(*) AS cnt FROM AllWeeks
            ),
            WeekRange AS (
              SELECT ev, het, ROW_NUMBER() OVER (ORDER BY ev DESC, het DESC) AS rn
              FROM AllWeeks
            ),
            SelectedWeeks AS (
              SELECT ev, het FROM WeekRange
              WHERE rn > @offset AND rn <= @offset + @pageSize
            )
            SELECT 
              CAST(DATEPART(YEAR, p.datum) AS VARCHAR) + '/' + RIGHT('0' + CAST(DATEPART(ISO_WEEK, p.datum) AS VARCHAR), 2) AS datum_label,
              DATEPART(YEAR, p.datum) AS ev,
              DATEPART(ISO_WEEK, p.datum) AS het,
              MIN(p.datum) AS het_eleje,
              MAX(p.datum) AS het_vege,
              COUNT(*) AS munkanapok,
              SUM(p.cel_perc) AS cel_perc,
              SUM(p.lehivott_siemens_dc) AS lehivott_siemens_dc,
              SUM(p.lehivott_no_siemens) AS lehivott_no_siemens,
              SUM(p.lehivott_ossz) AS lehivott_ossz,
              SUM(p.leadott_siemens_dc) AS leadott_siemens_dc,
              SUM(p.leadott_no_siemens) AS leadott_no_siemens,
              SUM(p.leadott_kaco) AS leadott_kaco,
              SUM(p.leadott_ossz) AS leadott_ossz,
              -- Százalékok
              CASE WHEN SUM(p.cel_perc) > 0 THEN CAST(SUM(p.lehivott_ossz) AS FLOAT) / SUM(p.cel_perc) * 100 ELSE 0 END AS lehivas_szazalek,
              CASE WHEN SUM(p.cel_perc) > 0 THEN CAST(SUM(p.leadott_ossz) AS FLOAT) / SUM(p.cel_perc) * 100 ELSE 0 END AS leadas_szazalek,
              CASE WHEN SUM(p.lehivott_ossz) > 0 THEN CAST(SUM(p.leadott_ossz) AS FLOAT) / SUM(p.lehivott_ossz) * 100 ELSE 0 END AS leadas_per_lehivas_szazalek,
              (SELECT cnt FROM TotalWeeks) AS total_weeks
            FROM ainova_napi_perces p
            INNER JOIN SelectedWeeks sw ON DATEPART(YEAR, p.datum) = sw.ev AND DATEPART(ISO_WEEK, p.datum) = sw.het
            WHERE p.datum <= @Yesterday
            GROUP BY DATEPART(YEAR, p.datum), DATEPART(ISO_WEEK, p.datum)
            ORDER BY DATEPART(YEAR, p.datum) ASC, DATEPART(ISO_WEEK, p.datum) ASC
          `);
        break;

      case 'havi':
        // Havi kimutatás: 12 hónap, nincs lapozás
        result = await pool.request()
          .query(`
            -- Mai napot kihagyjuk
            DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
            
            -- Utolsó 12 hónap
            WITH MonthRange AS (
              SELECT DISTINCT 
                DATEPART(YEAR, datum) AS ev,
                DATEPART(MONTH, datum) AS honap
              FROM ainova_napi_perces
              WHERE datum <= @Yesterday
            ),
            Last12Months AS (
              SELECT TOP 12 ev, honap FROM MonthRange
              ORDER BY ev DESC, honap DESC
            )
            SELECT 
              FORMAT(MIN(p.datum), 'yyyy. MMM', 'hu-HU') AS datum_label,
              DATEPART(YEAR, p.datum) AS ev,
              DATEPART(MONTH, p.datum) AS honap,
              MIN(p.datum) AS honap_eleje,
              MAX(p.datum) AS honap_vege,
              COUNT(*) AS munkanapok,
              SUM(p.cel_perc) AS cel_perc,
              SUM(p.lehivott_siemens_dc) AS lehivott_siemens_dc,
              SUM(p.lehivott_no_siemens) AS lehivott_no_siemens,
              SUM(p.lehivott_ossz) AS lehivott_ossz,
              SUM(p.leadott_siemens_dc) AS leadott_siemens_dc,
              SUM(p.leadott_no_siemens) AS leadott_no_siemens,
              SUM(p.leadott_kaco) AS leadott_kaco,
              SUM(p.leadott_ossz) AS leadott_ossz,
              -- Százalékok
              CASE WHEN SUM(p.cel_perc) > 0 THEN CAST(SUM(p.lehivott_ossz) AS FLOAT) / SUM(p.cel_perc) * 100 ELSE 0 END AS lehivas_szazalek,
              CASE WHEN SUM(p.cel_perc) > 0 THEN CAST(SUM(p.leadott_ossz) AS FLOAT) / SUM(p.cel_perc) * 100 ELSE 0 END AS leadas_szazalek,
              CASE WHEN SUM(p.lehivott_ossz) > 0 THEN CAST(SUM(p.leadott_ossz) AS FLOAT) / SUM(p.lehivott_ossz) * 100 ELSE 0 END AS leadas_per_lehivas_szazalek,
              12 AS total_months
            FROM ainova_napi_perces p
            INNER JOIN Last12Months lm ON DATEPART(YEAR, p.datum) = lm.ev AND DATEPART(MONTH, p.datum) = lm.honap
            WHERE p.datum <= @Yesterday
            GROUP BY DATEPART(YEAR, p.datum), DATEPART(MONTH, p.datum)
            ORDER BY DATEPART(YEAR, p.datum) ASC, DATEPART(MONTH, p.datum) ASC
          `);
        break;

      default:
        return ApiErrors.badRequest('Érvénytelen type paraméter. Érvényes: napi, heti, havi');
    }

    return NextResponse.json({
      success: true,
      type,
      data: result.recordset,
    });

  } catch (error) {
    return ApiErrors.internal(error, 'Napi Perces API');
  }
}
