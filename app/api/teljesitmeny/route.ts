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
          .query(`
            -- Az adatbázisban lévő legutolsó dátum és 30 nappal korábbi
            DECLARE @MaxDatum DATE = (SELECT MAX(datum) FROM ainova_teljesitmeny);
            DECLARE @MinDatum DATE = DATEADD(DAY, -30, @MaxDatum);
            
            -- Operátor statisztikák az utolsó 30 napban
            WITH OperatorStats AS (
              SELECT 
                t.torzsszam,
                MAX(t.nev) AS nev,
                MAX(t.muszak) AS muszak,
                COALESCE(MAX(o.pozicio), 'Operátor') AS pozicio,
                SUM(t.leadott_perc) AS ossz_perc,
                COUNT(*) AS munkanapok,
                -- Egyéni teljesítmény: leadott / (munkanapok * 480) * 100
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 AS atlag_szazalek
              FROM ainova_teljesitmeny t
              LEFT JOIN ainova_operatorok o ON t.torzsszam = o.torzsszam
              WHERE t.datum >= @MinDatum
                AND t.datum <= @MaxDatum
                AND (@isSUM = 1 OR t.muszak = @muszakFilter)
                AND (@pozicioFilter = '' OR o.pozicio = @pozicioFilter)
                AND (@searchFilter = '' OR t.torzsszam LIKE @searchFilter OR t.nev LIKE @searchFilter)
              GROUP BY t.torzsszam
              HAVING COUNT(*) >= 1  -- Legalább 1 munkanap elég
            ),
            TrendCalc AS (
              SELECT 
                s.torzsszam,
                s.nev,
                s.muszak,
                s.pozicio,
                s.ossz_perc,
                s.munkanapok,
                s.atlag_szazalek,
                @MinDatum AS period_start,
                @MaxDatum AS period_end,
                -- Trend: utolsó 7 nap vs előző 7 nap (az adatbázis max dátumától visszafelé)
                CASE 
                  WHEN (SELECT CAST(SUM(leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100
                        FROM ainova_teljesitmeny 
                        WHERE torzsszam = s.torzsszam 
                        AND datum >= DATEADD(DAY, -7, @MaxDatum)
                        AND datum <= @MaxDatum) 
                     > (SELECT CAST(SUM(leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100
                        FROM ainova_teljesitmeny 
                        WHERE torzsszam = s.torzsszam 
                        AND datum >= DATEADD(DAY, -14, @MaxDatum)
                        AND datum < DATEADD(DAY, -7, @MaxDatum)) + 2
                  THEN 'up'
                  WHEN (SELECT CAST(SUM(leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100
                        FROM ainova_teljesitmeny 
                        WHERE torzsszam = s.torzsszam 
                        AND datum >= DATEADD(DAY, -7, @MaxDatum)
                        AND datum <= @MaxDatum) 
                     < (SELECT CAST(SUM(leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100
                        FROM ainova_teljesitmeny 
                        WHERE torzsszam = s.torzsszam 
                        AND datum >= DATEADD(DAY, -14, @MaxDatum)
                        AND datum < DATEADD(DAY, -7, @MaxDatum)) - 2
                  THEN 'down'
                  ELSE 'stable'
                END AS trend
              FROM OperatorStats s
            )
            SELECT * FROM TrendCalc
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
          const hetiPageSize = 12;
          result = await pool.request()
            .input('torzsszam', sql.NVarChar, trendTorzsszam)
            .input('targetMinutes', sql.Int, DAILY_TARGET_MINUTES)
            .input('offset', sql.Int, trendOffset)
            .input('pageSize', sql.Int, hetiPageSize)
            .query(`
              -- Mai napot kihagyjuk
              DECLARE @Yesterday DATE = DATEADD(DAY, -1, CAST(GETDATE() AS DATE));
              
              -- Összes hét az operátornak
              WITH AllWeeks AS (
                SELECT DISTINCT 
                  DATEPART(YEAR, datum) AS ev, 
                  DATEPART(ISO_WEEK, datum) AS het
                FROM ainova_teljesitmeny
                WHERE torzsszam = @torzsszam AND datum <= @Yesterday
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
                CAST(DATEPART(YEAR, t.datum) AS VARCHAR) + '/' + RIGHT('0' + CAST(DATEPART(ISO_WEEK, t.datum) AS VARCHAR), 2) AS datum_label,
                DATEPART(YEAR, t.datum) AS ev,
                DATEPART(ISO_WEEK, t.datum) AS het,
                COUNT(*) AS munkanapok,
                SUM(t.leadott_perc) AS leadott_perc,
                COUNT(*) * @targetMinutes AS cel_perc,
                CAST(SUM(t.leadott_perc) AS FLOAT) / NULLIF(COUNT(*) * @targetMinutes, 0) * 100 AS szazalek,
                (SELECT cnt FROM TotalWeeks) AS total_weeks
              FROM ainova_teljesitmeny t
              INNER JOIN SelectedWeeks sw ON DATEPART(YEAR, t.datum) = sw.ev AND DATEPART(ISO_WEEK, t.datum) = sw.het
              WHERE t.torzsszam = @torzsszam AND t.datum <= @Yesterday
              GROUP BY DATEPART(YEAR, t.datum), DATEPART(ISO_WEEK, t.datum)
              ORDER BY DATEPART(YEAR, t.datum) ASC, DATEPART(ISO_WEEK, t.datum) ASC
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

      default:
        return ApiErrors.badRequest('Érvénytelen type paraméter. Érvényes: napi-kimutatas, heti-kimutatas, havi-kimutatas, egyeni-ranglista, egyeni-trend');
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
