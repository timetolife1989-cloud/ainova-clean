const sql = require('mssql');
const config = {
  server: 'SVEEA0160.tdk-prod.net',
  database: 'LaC_BasicDatas_TEST',
  options: { encrypt: false, trustServerCertificate: true },
  authentication: { type: 'ntlm', options: { domain: 'tdk-prod' } }
};

(async () => {
  const pool = await sql.connect(config);
  const result = await pool.request().query(`
    SELECT DISTINCT 
      DATEPART(YEAR, datum) AS ev,
      DATEPART(ISO_WEEK, datum) AS het_szam,
      MIN(datum) AS min_datum,
      MAX(datum) AS max_datum,
      COUNT(DISTINCT datum) AS napok
    FROM ainova_teljesitmeny
    WHERE datum < CAST(GETDATE() AS DATE)
    GROUP BY DATEPART(YEAR, datum), DATEPART(ISO_WEEK, datum)
    ORDER BY min_datum DESC
  `);
  console.log('Hetek az adatbázisban:');
  result.recordset.forEach(r => {
    console.log(`  ${r.ev}/${String(r.het_szam).padStart(2,'0')} : ${r.min_datum.toISOString().split('T')[0]} - ${r.max_datum.toISOString().split('T')[0]} (${r.napok} nap)`);
  });
  pool.close();
})();
