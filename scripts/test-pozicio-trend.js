// Pozíció trend API tesztelése
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const DAILY_TARGET_MINUTES = 480;
const MIN_VALID_DAILY_MINUTES = 1000;

async function testPozicioTrend() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  console.log('=== LaC szerelő pozíció trend (napi) ===\n');

  const result = await pool.request()
    .input('pozicio', sql.NVarChar, 'LaC szerelő')
    .input('muszakFilter', sql.NVarChar, 'SUM')
    .input('isSUM', sql.Bit, 1)
    .input('offset', sql.Int, 0)
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

  if (result.recordset.length > 0) {
    console.log(`Összesen ${result.recordset[0].total_days} nap adatából ${result.recordset.length} nap:\n`);
    result.recordset.forEach(row => {
      console.log(`${row.datum_label} | ${row.letszam} fő | ${row.leadott_perc} perc | ${row.szazalek.toFixed(1)}%`);
    });
  } else {
    console.log('Nincs adat!');
  }

  await pool.close();
}

testPozicioTrend().catch(console.error);
