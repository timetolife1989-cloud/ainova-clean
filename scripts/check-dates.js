const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  };

  const pool = await sql.connect(config);
  
  console.log('=== Teljesítmény tábla (ÖSSZES dátum összegzés) ===');
  const t = await pool.request().query(`
    SELECT 
      CONVERT(VARCHAR(10), datum, 23) as datum,
      COUNT(*) as rekord_szam,
      SUM(leadott_perc) as ossz_perc
    FROM ainova_teljesitmeny 
    GROUP BY datum 
    ORDER BY datum DESC
  `);
  console.table(t.recordset);
  
  console.log('\n=== Érvényes napok (>1000 perc, nem mai) ===');
  const v = await pool.request().query(`
    SELECT 
      CONVERT(VARCHAR(10), datum, 23) as datum,
      SUM(leadott_perc) as ossz_perc
    FROM ainova_teljesitmeny 
    WHERE datum < CAST(GETDATE() AS DATE)
    GROUP BY datum 
    HAVING SUM(leadott_perc) >= 1000
    ORDER BY datum DESC
  `);
  console.table(v.recordset);
  
  await pool.close();
}

main().catch(console.error);
