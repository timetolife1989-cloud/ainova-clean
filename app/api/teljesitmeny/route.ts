// =====================================================
// AINOVA - Teljesítmény Adatok API
// =====================================================
// Purpose: Teljesítmény statisztikák lekérése
// Method: GET
// Query: type=napi-kimutatas|heti-kimutatas|havi-kimutatas|egyeni-ranglista|egyeni-trend
//        muszak=A|B|C|SUM (opcionális filter)
//        torzsszam=xxxxx (egyéni trend-hez)
// =====================================================
// SZŰRÉSI SZABÁLYOK:
// 1. Mai napot MINDIG kihagyjuk (még nem zárt a műszak)
// 2. Napok ahol össz leadott_perc < 1000 → kihagyjuk (vasárnap, SAP hiba)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import { DAILY_TARGET_MINUTES, MIN_VALID_DAILY_MINUTES } from '@/lib/constants';
import { getWarRoomLetszamBatch } from '@/lib/warroom-letszam';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'napi-kimutatas';
    const muszakFilter = searchParams.get('muszak');

    const pool = await getPool();

    let result;

    switch (type) {
      case 'napi-kimutatas':
        // Napi kimutatás: 20 nap, lapozható, műszakonként vagy SUM
        // SZŰRÉS: mai nap kihagyása + min 1000 perc/nap
        const offset = parseInt(searchParams.get('offset') || '0');
        const pageSize = 20;
        const isSUM = !muszakFilter || muszakFilter === 'SUM';
        
        result = await pool.request()
          .input('muszakFilter', sql.NVarChar, muszakFilter || '')
          .input('offset', sql.Int, offset)
          .input('pageSize', sql.Int, pageSize)
          .input('isSUM', sql.Bit, isSUM ? 1 : 0)
          .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
          .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
          .query(`
            -- Érvényes napok: mai nap kihagyása + min perc szűrés
            WITH ValidDays AS (
              SELECT datum, SUM(leadott_perc) AS napi_ossz
              FROM ainova_teljesitmeny
              WHERE datum < CAST(GETDATE() AS DATE)  -- Mai nap kihagyása
              GROUP BY datum
              HAVING SUM(leadott_perc) >= @minDailyMinutes  -- Min 1000 perc/nap
            ),
            DateRange AS (
              SELECT DISTINCT t.datum
              FROM ainova_teljesitmeny t
              INNER JOIN ValidDays v ON t.datum = v.datum
              WHERE (@isSUM = 1 OR t.muszak = @muszakFilter)
              ORDER BY t.datum DESC
              OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            ),
            DailyData AS (
              SELECT 
                t.datum,
                FORMAT(t.datum, 'MM.dd', 'hu-HU') AS datum_label,
                DATENAME(WEEKDAY, t.datum) AS nap_nev,
                CASE WHEN @isSUM = 1 THEN 'SUM' ELSE t.muszak END AS muszak,
                COUNT(DISTINCT t.torzsszam) AS letszam,
                COUNT(DISTINCT t.torzsszam) * @targetMinutes AS cel_perc,
                SUM(t.leadott_perc) AS leadott_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(DISTINCT t.torzsszam) * @targetMinutes, 0) * 100 AS szazalek
              FROM ainova_teljesitmeny t
              INNER JOIN DateRange dr ON t.datum = dr.datum
              WHERE (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY t.datum, CASE WHEN @isSUM = 1 THEN 'SUM' ELSE t.muszak END
            )
            SELECT 
              *,
              (SELECT MIN(datum) FROM DateRange) AS period_start,
              (SELECT MAX(datum) FROM DateRange) AS period_end,
              (SELECT COUNT(*) FROM ValidDays) AS total_days
            FROM DailyData
            ORDER BY datum ASC
          `);
        
        // War Room nettó létszám hozzáadása
        if (result.recordset && result.recordset.length > 0) {
          const datumok = result.recordset.map((r: { datum: Date }) => {
            const d = new Date(r.datum);
            return d.toISOString().split('T')[0];
          });
          
          console.log('[WarRoom API] Datumok:', JSON.stringify(datumok), 'muszak:', muszakFilter);
          
          const muszakForWarRoom = (muszakFilter === 'SUM' || !muszakFilter) ? 'SUM' : muszakFilter as 'A' | 'B' | 'C';
          const warRoomLetszam = await getWarRoomLetszamBatch(muszakForWarRoom, datumok);
          console.log('[WarRoom API] Batch result:', JSON.stringify(Array.from(warRoomLetszam.entries())));
          
          // Netto létszám hozzáadása és % újraszámolása
          const enrichedRecords = result.recordset.map((row: { 
            datum: Date; 
            letszam: number; 
            leadott_perc: number;
            szazalek: number;
            cel_perc: number;
          }) => {
            const datumStr = new Date(row.datum).toISOString().split('T')[0];
            const warRoomValue = warRoomLetszam.get(datumStr);
            const hasWarRoomData = warRoomValue !== undefined && warRoomValue > 0;
            const nettoLetszam = hasWarRoomData ? warRoomValue : row.letszam;
            const nettoCelPerc = nettoLetszam * DAILY_TARGET_MINUTES;
            const nettoSzazalek = nettoCelPerc > 0 ? (row.leadott_perc / nettoCelPerc) * 100 : 0;
            
            return {
              ...row,
              visszajelentes_letszam: row.letszam,  // Eredeti: visszajelentéssel rendelkezők
              netto_letszam: nettoLetszam,          // War Room: tényleges produktív létszám
              netto_cel_perc: nettoCelPerc,         // Nettó létszám × 480
              netto_szazalek: nettoSzazalek,        // Leadott / nettó cél × 100
              has_warroom_data: hasWarRoomData,     // Van-e tényleges War Room adat?
            };
          });
          // @ts-expect-error - enriched records extend original type
          result.recordset = enrichedRecords;
        }
        break;

      case 'heti-kimutatas':
        // Heti kimutatás: 12 hét, lapozható, műszakonként vagy SUM
        // SZŰRÉS: mai nap kihagyása + min perc szűrés naponként
        const hetiOffset = parseInt(searchParams.get('offset') || '0');
        const hetiPageSize = 12;
        const isHetiSUM = !muszakFilter || muszakFilter === 'SUM';
        
        result = await pool.request()
          .input('muszakFilter', sql.NVarChar, muszakFilter || '')
          .input('offset', sql.Int, hetiOffset)
          .input('pageSize', sql.Int, hetiPageSize)
          .input('isSUM', sql.Bit, isHetiSUM ? 1 : 0)
          .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
          .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
          .query(`
            -- Érvényes napok: mai nap kihagyása + min perc szűrés
            WITH ValidDays AS (
              SELECT datum, SUM(leadott_perc) AS napi_ossz
              FROM ainova_teljesitmeny
              WHERE datum < CAST(GETDATE() AS DATE)
              GROUP BY datum
              HAVING SUM(leadott_perc) >= @minDailyMinutes
            ),
            WeekRange AS (
              -- ISO hét év: ha a hét 1 és a hónap december, akkor következő év
              -- ha a hét 52/53 és a hónap január, akkor előző év
              SELECT DISTINCT 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END AS ev,
                DATEPART(ISO_WEEK, t.datum) AS het_szam,
                MIN(t.datum) AS het_elso_nap
              FROM ainova_teljesitmeny t
              INNER JOIN ValidDays v ON t.datum = v.datum
              WHERE (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END,
                DATEPART(ISO_WEEK, t.datum)
              ORDER BY het_elso_nap DESC
              OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
            ),
            WeeklyData AS (
              SELECT 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END AS ev,
                DATEPART(ISO_WEEK, t.datum) AS het_szam,
                -- het_label is helyes évet használ
                CAST(CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END AS VARCHAR) + '/' + RIGHT('0' + CAST(DATEPART(ISO_WEEK, t.datum) AS VARCHAR), 2) AS het_label,
                MIN(t.datum) AS het_eleje,
                MAX(t.datum) AS het_vege,
                CASE WHEN @isSUM = 1 THEN 'SUM' ELSE t.muszak END AS muszak,
                COUNT(DISTINCT t.torzsszam) AS letszam,
                COUNT(DISTINCT t.datum) AS munkanapok,
                COUNT(DISTINCT t.torzsszam) * COUNT(DISTINCT t.datum) * @targetMinutes AS cel_perc,
                SUM(t.leadott_perc) AS leadott_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(DISTINCT t.torzsszam) * COUNT(DISTINCT t.datum) * @targetMinutes, 0) * 100 AS szazalek
              FROM ainova_teljesitmeny t
              INNER JOIN ValidDays v ON t.datum = v.datum
              INNER JOIN WeekRange wr ON 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END = wr.ev 
                AND DATEPART(ISO_WEEK, t.datum) = wr.het_szam
              WHERE (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END, 
                DATEPART(ISO_WEEK, t.datum), 
                CASE WHEN @isSUM = 1 THEN 'SUM' ELSE t.muszak END
            )
            SELECT 
              *,
              (SELECT MIN(het_szam) FROM WeekRange) AS period_start_week,
              (SELECT MAX(het_szam) FROM WeekRange) AS period_end_week,
              (SELECT COUNT(DISTINCT CAST(ev AS VARCHAR) + '-' + CAST(het_szam AS VARCHAR)) 
               FROM (
                 SELECT DISTINCT 
                   CASE 
                     WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                     WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                     ELSE DATEPART(YEAR, t.datum)
                   END AS ev, 
                   DATEPART(ISO_WEEK, t.datum) AS het_szam
                 FROM ainova_teljesitmeny t
                 INNER JOIN ValidDays v ON t.datum = v.datum
                 WHERE (@isSUM = 1 OR t.muszak = @muszakFilter)
               ) weeks) AS total_weeks
            FROM WeeklyData
            ORDER BY ev ASC, het_szam ASC
          `);
        break;

      case 'havi-kimutatas':
        // Havi kimutatás: 12 hónap, műszakonként vagy SUM
        // SZŰRÉS: mai nap kihagyása + min perc szűrés naponként
        const isHaviSUM = !muszakFilter || muszakFilter === 'SUM';
        
        result = await pool.request()
          .input('muszakFilter', sql.NVarChar, muszakFilter || '')
          .input('isSUM', sql.Bit, isHaviSUM ? 1 : 0)
          .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
          .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
          .query(`
            -- Érvényes napok: mai nap kihagyása + min perc szűrés
            WITH ValidDays AS (
              SELECT datum, SUM(leadott_perc) AS napi_ossz
              FROM ainova_teljesitmeny
              WHERE datum < CAST(GETDATE() AS DATE)
              GROUP BY datum
              HAVING SUM(leadott_perc) >= @minDailyMinutes
            ),
            MonthRange AS (
              SELECT DISTINCT 
                DATEPART(YEAR, t.datum) AS ev,
                DATEPART(MONTH, t.datum) AS honap_szam
              FROM ainova_teljesitmeny t
              INNER JOIN ValidDays v ON t.datum = v.datum
              WHERE t.datum >= DATEADD(MONTH, -12, CAST(GETDATE() AS DATE))
                AND (@isSUM = 1 OR t.muszak = @muszakFilter)
            ),
            MonthlyData AS (
              SELECT 
                DATEPART(YEAR, t.datum) AS ev,
                DATEPART(MONTH, t.datum) AS honap_szam,
                FORMAT(MIN(t.datum), 'yyyy. MMM', 'hu-HU') AS honap_label,
                MIN(t.datum) AS honap_eleje,
                MAX(t.datum) AS honap_vege,
                CASE WHEN @isSUM = 1 THEN 'SUM' ELSE t.muszak END AS muszak,
                COUNT(DISTINCT t.torzsszam) AS letszam,
                COUNT(DISTINCT t.datum) AS munkanapok,
                COUNT(DISTINCT t.torzsszam) * COUNT(DISTINCT t.datum) * @targetMinutes AS cel_perc,
                SUM(t.leadott_perc) AS leadott_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(DISTINCT t.torzsszam) * COUNT(DISTINCT t.datum) * @targetMinutes, 0) * 100 AS szazalek
              FROM ainova_teljesitmeny t
              INNER JOIN ValidDays v ON t.datum = v.datum
              INNER JOIN MonthRange mr ON DATEPART(YEAR, t.datum) = mr.ev AND DATEPART(MONTH, t.datum) = mr.honap_szam
              WHERE (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY DATEPART(YEAR, t.datum), DATEPART(MONTH, t.datum), CASE WHEN @isSUM = 1 THEN 'SUM' ELSE t.muszak END
            )
            SELECT 
              *,
              (SELECT COUNT(*) FROM MonthRange) AS total_months
            FROM MonthlyData
            ORDER BY ev ASC, honap_szam ASC
          `);
        break;

      case 'egyeni-ranglista':
        // Egyéni teljesítmény ranglista - UTOLSÓ 30 NAP az adatbázisban
        // Operátoronként: 480 perc = 100%
        // Kompakt layout: összes/havi/heti/utolsó nap bontás
        // FONTOS: Ugyanaz a szűrés mint a produktívnál - min perc/nap!
        const ranglistaMuszak = searchParams.get('muszak') || 'SUM';
        const ranglistaPozicio = searchParams.get('pozicio');
        const ranglistaSearch = searchParams.get('search');
        const isRanglistaSUM = ranglistaMuszak === 'SUM';
        
        result = await pool.request()
          .input('muszakFilter', sql.NVarChar, ranglistaMuszak)
          .input('isSUM', sql.Bit, isRanglistaSUM ? 1 : 0)
          .input('pozicioFilter', sql.NVarChar, ranglistaPozicio || '')
          .input('searchFilter', sql.NVarChar, ranglistaSearch ? `%${ranglistaSearch}%` : '')
          .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
          .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
          .query(`
            -- Érvényes napok szűrése (ugyanaz mint a produktívnál)
            -- Mai nap kihagyása + min perc szűrés (SAP csúszás kiszűrése)
            WITH ValidDays AS (
              SELECT datum
              FROM ainova_teljesitmeny
              WHERE datum < CAST(GETDATE() AS DATE)
              GROUP BY datum
              HAVING SUM(leadott_perc) >= @minDailyMinutes
            ),
            Params AS (
              SELECT 
                (SELECT MAX(datum) FROM ValidDays) AS MaxDatum,
                DATEADD(DAY, -30, (SELECT MAX(datum) FROM ValidDays)) AS MinDatum,
                DATEPART(ISO_WEEK, (SELECT MAX(datum) FROM ValidDays)) AS HetSzam,
                -- ISO hét év (helyes év a hét számhoz)
                CASE 
                  WHEN DATEPART(ISO_WEEK, (SELECT MAX(datum) FROM ValidDays)) = 1 
                       AND MONTH((SELECT MAX(datum) FROM ValidDays)) = 12 
                  THEN YEAR((SELECT MAX(datum) FROM ValidDays)) + 1
                  WHEN DATEPART(ISO_WEEK, (SELECT MAX(datum) FROM ValidDays)) >= 52 
                       AND MONTH((SELECT MAX(datum) FROM ValidDays)) = 1 
                  THEN YEAR((SELECT MAX(datum) FROM ValidDays)) - 1
                  ELSE YEAR((SELECT MAX(datum) FROM ValidDays))
                END AS IsoEv,
                DATEADD(DAY, 1-DATEPART(WEEKDAY, (SELECT MAX(datum) FROM ValidDays)), (SELECT MAX(datum) FROM ValidDays)) AS HetEleje,
                DATEFROMPARTS(YEAR((SELECT MAX(datum) FROM ValidDays)), MONTH((SELECT MAX(datum) FROM ValidDays)), 1) AS HonapEleje,
                MONTH((SELECT MAX(datum) FROM ValidDays)) AS HonapSzam
            )
            SELECT 
              p.MaxDatum AS _maxDatum,
              t.torzsszam,
              MAX(t.nev) AS nev,
              MAX(t.muszak) AS muszak,
              COALESCE(MAX(o.pozicio), 'Operator') AS pozicio,
              SUM(t.leadott_perc) AS ossz_perc,
              COUNT(*) AS munkanapok,
              CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 AS atlag_szazalek,
              -- Havi stats - csak érvényes napok
              (SELECT COUNT(*) FROM ainova_teljesitmeny sub 
               INNER JOIN ValidDays v ON sub.datum = v.datum
               WHERE sub.torzsszam = t.torzsszam AND sub.datum >= p.HonapEleje) AS havi_munkanapok,
              (SELECT CAST(SUM(sub.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 
               FROM ainova_teljesitmeny sub
               INNER JOIN ValidDays v ON sub.datum = v.datum
               WHERE sub.torzsszam = t.torzsszam AND sub.datum >= p.HonapEleje) AS havi_szazalek,
              CASE p.HonapSzam WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr' 
                WHEN 5 THEN 'Maj' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' 
                WHEN 9 THEN 'Szep' WHEN 10 THEN 'Okt' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec' END AS havi_label,
              -- Heti stats - csak érvényes napok
              (SELECT COUNT(*) FROM ainova_teljesitmeny sub
               INNER JOIN ValidDays v ON sub.datum = v.datum
               WHERE sub.torzsszam = t.torzsszam AND sub.datum >= p.HetEleje AND sub.datum <= p.MaxDatum) AS heti_munkanapok,
              (SELECT CAST(SUM(sub.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 
               FROM ainova_teljesitmeny sub
               INNER JOIN ValidDays v ON sub.datum = v.datum
               WHERE sub.torzsszam = t.torzsszam AND sub.datum >= p.HetEleje AND sub.datum <= p.MaxDatum) AS heti_szazalek,
              CAST(p.IsoEv AS NVARCHAR(4)) + '/' + RIGHT('0' + CAST(p.HetSzam AS NVARCHAR(2)), 2) AS heti_label,
              -- Utolsó ÉRVÉNYES nap - az adott operátor dolgozott-e aznap
              (SELECT CAST(leadott_perc AS FLOAT) / @targetMinutes * 100 
               FROM ainova_teljesitmeny WHERE torzsszam = t.torzsszam AND datum = p.MaxDatum) AS utolso_nap_szazalek,
              -- Utolsó nap label (pl. "Jan 9")
              CASE MONTH(p.MaxDatum) WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr' 
                WHEN 5 THEN 'Maj' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' 
                WHEN 9 THEN 'Szep' WHEN 10 THEN 'Okt' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec' END 
                + ' ' + CAST(DAY(p.MaxDatum) AS NVARCHAR(2)) AS utolso_nap_label,
              -- Trend (csak érvényes napokból)
              'stable' AS trend
            FROM ainova_teljesitmeny t
            INNER JOIN ValidDays vd ON t.datum = vd.datum
            LEFT JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
            CROSS JOIN Params p
            WHERE t.datum >= p.MinDatum
              AND t.datum <= p.MaxDatum
              AND (@isSUM = 1 OR t.muszak = @muszakFilter)
              AND (@pozicioFilter = '' OR o.pozicio = @pozicioFilter)
              AND (@searchFilter = '' OR t.torzsszam LIKE @searchFilter OR t.nev LIKE @searchFilter)
            GROUP BY t.torzsszam, p.MaxDatum, p.MinDatum, p.HetSzam, p.IsoEv, p.HetEleje, p.HonapEleje, p.HonapSzam
            HAVING COUNT(*) >= 1
            ORDER BY atlag_szazalek DESC
          `);
        break;

      case 'egyeni-trend':
        // Egyéni operátor trend - UGYANAZ a navigációs logika mint a produktívnál!
        // Napi: 20 nap, offset lapozás
        // Heti: 12 hét, offset lapozás
        // Havi: 12 hónap, nincs lapozás
        // Mai napot kihagyjuk (nincs lezárva)!
        const trendTorzsszam = searchParams.get('torzsszam');
        const trendKimutat = searchParams.get('kimutat') || 'napi';
        const trendOffset = parseInt(searchParams.get('offset') || '0');
        
        if (!trendTorzsszam) {
          return NextResponse.json({ error: 'torzsszam parameter required' }, { status: 400 });
        }

        if (trendKimutat === 'napi') {
          // Napi bontás: 20 nap, lapozható
          const napiPageSize = 20;
          result = await pool.request()
            .input('torzsszam', sql.NVarChar, trendTorzsszam)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .input('offset', sql.Int, trendOffset)
            .input('pageSize', sql.Int, napiPageSize)
            .query(`
              -- Mai napot kihagyjuk
              DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
              
              -- Összes nap az operátornak (mai nap nélkül)
              DECLARE @TotalDays INT = (
                SELECT COUNT(*) FROM ainova_teljesitmeny 
                WHERE torzsszam = @torzsszam AND datum <= @Yesterday
              );
              
              -- Lapozható dátum range
              WITH DateRange AS (
                SELECT datum
                FROM ainova_teljesitmeny
                WHERE torzsszam = @torzsszam AND datum <= @Yesterday
                ORDER BY datum DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
              )
              SELECT 
                FORMAT(t.datum, 'MM.dd', 'hu-HU') AS datum_label,
                t.datum,
                t.leadott_perc,
                @targetMinutes AS cel_perc,
                CAST(t.leadott_perc AS FLOAT) / @targetMinutes * 100 AS szazalek,
                @TotalDays AS total_days
              FROM ainova_teljesitmeny t
              INNER JOIN DateRange dr ON t.datum = dr.datum
              WHERE t.torzsszam = @torzsszam
              ORDER BY t.datum ASC
            `);
        } else if (trendKimutat === 'heti') {
          // Heti bontás: 12 hét, lapozható
          // ISO hét év: ha a hét 1 és a hónap december, akkor következő év
          //             ha a hét 52/53 és a hónap január, akkor előző év
          const hetiPageSize = 12;
          result = await pool.request()
            .input('torzsszam', sql.NVarChar, trendTorzsszam)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .input('offset', sql.Int, trendOffset)
            .input('pageSize', sql.Int, hetiPageSize)
            .query(`
              -- Mai napot kihagyjuk
              DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
              
              -- ISO hét év számítás (helyes év a hét számhoz)
              -- Összes hét az operátornak
              WITH AllWeeks AS (
                SELECT DISTINCT 
                  CASE 
                    WHEN DATEPART(ISO_WEEK, datum) = 1 AND DATEPART(MONTH, datum) = 12 THEN DATEPART(YEAR, datum) + 1
                    WHEN DATEPART(ISO_WEEK, datum) >= 52 AND DATEPART(MONTH, datum) = 1 THEN DATEPART(YEAR, datum) - 1
                    ELSE DATEPART(YEAR, datum)
                  END AS iso_ev, 
                  DATEPART(ISO_WEEK, datum) AS het,
                  MIN(datum) AS het_elso_nap
                FROM ainova_teljesitmeny
                WHERE torzsszam = @torzsszam AND datum <= @Yesterday
                GROUP BY 
                  CASE 
                    WHEN DATEPART(ISO_WEEK, datum) = 1 AND DATEPART(MONTH, datum) = 12 THEN DATEPART(YEAR, datum) + 1
                    WHEN DATEPART(ISO_WEEK, datum) >= 52 AND DATEPART(MONTH, datum) = 1 THEN DATEPART(YEAR, datum) - 1
                    ELSE DATEPART(YEAR, datum)
                  END,
                  DATEPART(ISO_WEEK, datum)
              ),
              TotalWeeks AS (
                SELECT COUNT(*) AS cnt FROM AllWeeks
              ),
              WeekRange AS (
                SELECT iso_ev, het, het_elso_nap, ROW_NUMBER() OVER (ORDER BY het_elso_nap DESC) AS rn
                FROM AllWeeks
              ),
              SelectedWeeks AS (
                SELECT iso_ev, het FROM WeekRange
                WHERE rn > @offset AND rn <= @offset + @pageSize
              )
              SELECT 
                CAST(sw.iso_ev AS VARCHAR) + '/' + RIGHT('0' + CAST(sw.het AS VARCHAR), 2) AS datum_label,
                sw.iso_ev AS ev,
                sw.het,
                COUNT(*) AS munkanapok,
                SUM(t.leadott_perc) AS leadott_perc,
                COUNT(*) * @targetMinutes AS cel_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 AS szazalek,
                (SELECT cnt FROM TotalWeeks) AS total_weeks
              FROM ainova_teljesitmeny t
              INNER JOIN SelectedWeeks sw ON 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END = sw.iso_ev 
                AND DATEPART(ISO_WEEK, t.datum) = sw.het
              WHERE t.torzsszam = @torzsszam AND t.datum <= @Yesterday
              GROUP BY sw.iso_ev, sw.het
              ORDER BY sw.iso_ev ASC, sw.het ASC
            `);
        } else {
          // Havi bontás: 12 hónap, NINCS lapozás
          result = await pool.request()
            .input('torzsszam', sql.NVarChar, trendTorzsszam)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .query(`
              -- Mai napot kihagyjuk
              DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
              
              -- Utolsó 12 hónap
              WITH MonthRange AS (
                SELECT DISTINCT 
                  DATEPART(YEAR, datum) AS ev, 
                  DATEPART(MONTH, datum) AS honap
                FROM ainova_teljesitmeny
                WHERE torzsszam = @torzsszam AND datum <= @Yesterday
              ),
              Last12Months AS (
                SELECT TOP 12 ev, honap FROM MonthRange
                ORDER BY ev DESC, honap DESC
              )
              SELECT 
                FORMAT(MIN(t.datum), 'yyyy. MMM', 'hu-HU') AS datum_label,
                DATEPART(YEAR, t.datum) AS ev,
                DATEPART(MONTH, t.datum) AS honap,
                COUNT(*) AS munkanapok,
                SUM(t.leadott_perc) AS leadott_perc,
                COUNT(*) * @targetMinutes AS cel_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 AS szazalek,
                12 AS total_months
              FROM ainova_teljesitmeny t
              INNER JOIN Last12Months lm ON DATEPART(YEAR, t.datum) = lm.ev AND DATEPART(MONTH, t.datum) = lm.honap
              WHERE t.torzsszam = @torzsszam AND t.datum <= @Yesterday
              GROUP BY DATEPART(YEAR, t.datum), DATEPART(MONTH, t.datum)
              ORDER BY DATEPART(YEAR, t.datum) ASC, DATEPART(MONTH, t.datum) ASC
            `);
        }
        break;

      case 'pozicio-trend':
        // Pozíció-szintű trend: napi vagy heti bontás egy adott pozícióhoz
        // Műszak szerint szűrhető (A, B, C vagy SUM)
        const pozicioTrendPozicio = searchParams.get('pozicio');
        const pozicioTrendMuszak = searchParams.get('muszak') || 'SUM';
        const pozicioTrendKimutat = searchParams.get('kimutat') || 'napi';
        const pozicioTrendOffset = parseInt(searchParams.get('offset') || '0');
        const isPozicioSUM = pozicioTrendMuszak === 'SUM';
        
        if (!pozicioTrendPozicio) {
          return ApiErrors.badRequest('pozicio paraméter kötelező');
        }
        
        if (pozicioTrendKimutat === 'napi') {
          // Napi bontás: 14 nap
          result = await pool.request()
            .input('pozicio', sql.NVarChar, pozicioTrendPozicio)
            .input('muszakFilter', sql.NVarChar, pozicioTrendMuszak)
            .input('isSUM', sql.Bit, isPozicioSUM ? 1 : 0)
            .input('offset', sql.Int, pozicioTrendOffset)
            .input('pageSize', sql.Int, 14)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
            .query(`
              WITH ValidDays AS (
                SELECT datum
                FROM ainova_teljesitmeny
                WHERE datum < CAST(GETDATE() AS DATE)
                GROUP BY datum
                HAVING SUM(leadott_perc) >= @minDailyMinutes
              ),
              DateRange AS (
                SELECT DISTINCT t.datum
                FROM ainova_teljesitmeny t
                INNER JOIN ValidDays v ON t.datum = v.datum
                INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
                WHERE o.pozicio = @pozicio
                  AND (@isSUM = 1 OR t.muszak = @muszakFilter)
                ORDER BY t.datum DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
              ),
              TotalDays AS (
                SELECT COUNT(DISTINCT t.datum) as cnt
                FROM ainova_teljesitmeny t
                INNER JOIN ValidDays v ON t.datum = v.datum
                INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
                WHERE o.pozicio = @pozicio
                  AND (@isSUM = 1 OR t.muszak = @muszakFilter)
              )
              SELECT 
                FORMAT(t.datum, 'MM.dd', 'hu-HU') AS datum_label,
                t.datum,
                COUNT(DISTINCT t.torzsszam) AS letszam,
                SUM(t.leadott_perc) AS leadott_perc,
                COUNT(DISTINCT t.torzsszam) * @targetMinutes AS cel_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(DISTINCT t.torzsszam) * @targetMinutes, 0) * 100 AS szazalek,
                (SELECT cnt FROM TotalDays) AS total_days
              FROM ainova_teljesitmeny t
              INNER JOIN DateRange dr ON t.datum = dr.datum
              INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
              WHERE o.pozicio = @pozicio
                AND (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY t.datum
              ORDER BY t.datum ASC
            `);
        } else if (pozicioTrendKimutat === 'heti') {
          // Heti bontás: 12 hét
          result = await pool.request()
            .input('pozicio', sql.NVarChar, pozicioTrendPozicio)
            .input('muszakFilter', sql.NVarChar, pozicioTrendMuszak)
            .input('isSUM', sql.Bit, isPozicioSUM ? 1 : 0)
            .input('offset', sql.Int, pozicioTrendOffset)
            .input('pageSize', sql.Int, 12)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
            .query(`
              WITH ValidDays AS (
                SELECT datum
                FROM ainova_teljesitmeny
                WHERE datum < CAST(GETDATE() AS DATE)
                GROUP BY datum
                HAVING SUM(leadott_perc) >= @minDailyMinutes
              ),
              WeekRange AS (
                SELECT DISTINCT 
                  CASE 
                    WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                    WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                    ELSE DATEPART(YEAR, t.datum)
                  END AS iso_ev,
                  DATEPART(ISO_WEEK, t.datum) AS het,
                  MIN(t.datum) AS het_elso_nap
                FROM ainova_teljesitmeny t
                INNER JOIN ValidDays v ON t.datum = v.datum
                INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
                WHERE o.pozicio = @pozicio
                  AND (@isSUM = 1 OR t.muszak = @muszakFilter)
                GROUP BY 
                  CASE 
                    WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                    WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                    ELSE DATEPART(YEAR, t.datum)
                  END,
                  DATEPART(ISO_WEEK, t.datum)
                ORDER BY het_elso_nap DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
              ),
              TotalWeeks AS (
                SELECT COUNT(DISTINCT CAST(
                  CASE 
                    WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                    WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                    ELSE DATEPART(YEAR, t.datum)
                  END AS VARCHAR) + '-' + CAST(DATEPART(ISO_WEEK, t.datum) AS VARCHAR)) as cnt
                FROM ainova_teljesitmeny t
                INNER JOIN ValidDays v ON t.datum = v.datum
                INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
                WHERE o.pozicio = @pozicio
                  AND (@isSUM = 1 OR t.muszak = @muszakFilter)
              )
              SELECT 
                CAST(wr.iso_ev AS VARCHAR) + '/' + RIGHT('0' + CAST(wr.het AS VARCHAR), 2) AS datum_label,
                wr.iso_ev AS ev,
                wr.het,
                COUNT(DISTINCT t.torzsszam) AS letszam,
                SUM(t.leadott_perc) AS leadott_perc,
                -- Heti: napi átlag létszám × napok × 480 (összes munkanap)
                COUNT(DISTINCT t.datum) * (SELECT COUNT(DISTINCT sub.torzsszam) FROM ainova_teljesitmeny sub 
                  INNER JOIN ainova_operatorok so ON sub.torzsszam = so.torzsszam
                  WHERE so.pozicio = @pozicio 
                    AND (@isSUM = 1 OR sub.muszak = @muszakFilter)
                    AND CASE 
                      WHEN DATEPART(ISO_WEEK, sub.datum) = 1 AND DATEPART(MONTH, sub.datum) = 12 THEN DATEPART(YEAR, sub.datum) + 1
                      WHEN DATEPART(ISO_WEEK, sub.datum) >= 52 AND DATEPART(MONTH, sub.datum) = 1 THEN DATEPART(YEAR, sub.datum) - 1
                      ELSE DATEPART(YEAR, sub.datum)
                    END = wr.iso_ev AND DATEPART(ISO_WEEK, sub.datum) = wr.het
                ) / NULLIF(COUNT(DISTINCT t.datum), 0) * COUNT(DISTINCT t.datum) * @targetMinutes AS cel_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / 
                  NULLIF(COUNT(DISTINCT t.datum) * (SELECT COUNT(DISTINCT sub.torzsszam) FROM ainova_teljesitmeny sub 
                    INNER JOIN ainova_operatorok so ON sub.torzsszam = so.torzsszam
                    WHERE so.pozicio = @pozicio 
                      AND (@isSUM = 1 OR sub.muszak = @muszakFilter)
                      AND CASE 
                        WHEN DATEPART(ISO_WEEK, sub.datum) = 1 AND DATEPART(MONTH, sub.datum) = 12 THEN DATEPART(YEAR, sub.datum) + 1
                        WHEN DATEPART(ISO_WEEK, sub.datum) >= 52 AND DATEPART(MONTH, sub.datum) = 1 THEN DATEPART(YEAR, sub.datum) - 1
                        ELSE DATEPART(YEAR, sub.datum)
                      END = wr.iso_ev AND DATEPART(ISO_WEEK, sub.datum) = wr.het
                  ) / NULLIF(COUNT(DISTINCT t.datum), 0) * COUNT(DISTINCT t.datum) * @targetMinutes, 0) * 100 AS szazalek,
                (SELECT cnt FROM TotalWeeks) AS total_weeks
              FROM ainova_teljesitmeny t
              INNER JOIN WeekRange wr ON 
                CASE 
                  WHEN DATEPART(ISO_WEEK, t.datum) = 1 AND DATEPART(MONTH, t.datum) = 12 THEN DATEPART(YEAR, t.datum) + 1
                  WHEN DATEPART(ISO_WEEK, t.datum) >= 52 AND DATEPART(MONTH, t.datum) = 1 THEN DATEPART(YEAR, t.datum) - 1
                  ELSE DATEPART(YEAR, t.datum)
                END = wr.iso_ev 
                AND DATEPART(ISO_WEEK, t.datum) = wr.het
              INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
              WHERE o.pozicio = @pozicio
                AND (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY wr.iso_ev, wr.het
              ORDER BY wr.iso_ev ASC, wr.het ASC
            `);
        } else {
          // Havi bontás: utolsó 12 hónap
          result = await pool.request()
            .input('pozicio', sql.NVarChar, pozicioTrendPozicio)
            .input('muszakFilter', sql.NVarChar, pozicioTrendMuszak)
            .input('isSUM', sql.Bit, isPozicioSUM ? 1 : 0)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .input('minDailyMinutes', sql.Int, MIN_VALID_DAILY_MINUTES)
            .query(`
              WITH ValidDays AS (
                SELECT datum
                FROM ainova_teljesitmeny
                WHERE datum < CAST(GETDATE() AS DATE)
                GROUP BY datum
                HAVING SUM(leadott_perc) >= @minDailyMinutes
              ),
              MonthRange AS (
                SELECT DISTINCT 
                  YEAR(t.datum) AS ev,
                  MONTH(t.datum) AS honap,
                  MIN(t.datum) AS honap_elso_nap
                FROM ainova_teljesitmeny t
                INNER JOIN ValidDays v ON t.datum = v.datum
                INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
                WHERE o.pozicio = @pozicio
                  AND (@isSUM = 1 OR t.muszak = @muszakFilter)
                GROUP BY YEAR(t.datum), MONTH(t.datum)
              ),
              TotalMonths AS (
                SELECT COUNT(*) as cnt FROM MonthRange
              )
              SELECT 
                CAST(mr.ev AS VARCHAR) + '/' + RIGHT('0' + CAST(mr.honap AS VARCHAR), 2) AS datum_label,
                mr.ev,
                mr.honap,
                COUNT(DISTINCT t.torzsszam) AS letszam,
                SUM(t.leadott_perc) AS leadott_perc,
                -- Havi: napi átlag létszám × napok × 480
                COUNT(DISTINCT t.datum) * (SELECT COUNT(DISTINCT sub.torzsszam) FROM ainova_teljesitmeny sub 
                  INNER JOIN ainova_operatorok so ON sub.torzsszam = so.torzsszam
                  WHERE so.pozicio = @pozicio 
                    AND (@isSUM = 1 OR sub.muszak = @muszakFilter)
                    AND YEAR(sub.datum) = mr.ev AND MONTH(sub.datum) = mr.honap
                ) / NULLIF(COUNT(DISTINCT t.datum), 0) * COUNT(DISTINCT t.datum) * @targetMinutes AS cel_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / 
                  NULLIF(COUNT(DISTINCT t.datum) * (SELECT COUNT(DISTINCT sub.torzsszam) FROM ainova_teljesitmeny sub 
                    INNER JOIN ainova_operatorok so ON sub.torzsszam = so.torzsszam
                    WHERE so.pozicio = @pozicio 
                      AND (@isSUM = 1 OR sub.muszak = @muszakFilter)
                      AND YEAR(sub.datum) = mr.ev AND MONTH(sub.datum) = mr.honap
                  ) / NULLIF(COUNT(DISTINCT t.datum), 0) * COUNT(DISTINCT t.datum) * @targetMinutes, 0) * 100 AS szazalek,
                (SELECT cnt FROM TotalMonths) AS total_months
              FROM ainova_teljesitmeny t
              INNER JOIN MonthRange mr ON YEAR(t.datum) = mr.ev AND MONTH(t.datum) = mr.honap
              INNER JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
              WHERE o.pozicio = @pozicio
                AND (@isSUM = 1 OR t.muszak = @muszakFilter)
              GROUP BY mr.ev, mr.honap
              ORDER BY mr.ev ASC, mr.honap ASC
            `);
        }
        break;

      default:
        return ApiErrors.badRequest('Érvénytelen type paraméter. Érvényes: napi-kimutatas, heti-kimutatas, havi-kimutatas, egyeni-ranglista, egyeni-trend, pozicio-trend');
    }

    return NextResponse.json({
      success: true,
      type,
      data: result.recordset,
    });

  } catch (error) {
    return ApiErrors.internal(error, 'Teljesítmény API');
  }
}
