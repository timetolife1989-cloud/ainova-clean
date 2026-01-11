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
  
  console.log('=== WarRoomLetszam tábla (top 10) ===');
  const wr = await pool.request().query(`
    SELECT TOP 10 
      CONVERT(VARCHAR(10), Datum, 23) as datum, 
      Muszak, 
      NettoLetszam 
    FROM WarRoomLetszam 
    ORDER BY Datum DESC
  `);
  console.table(wr.recordset);
  
  console.log('\n=== Teljesítmény tábla (top 5 dátum) ===');
  const t = await pool.request().query(`
    SELECT TOP 5 
      CONVERT(VARCHAR(10), datum, 23) as datum,
      COUNT(*) as rekord_szam
    FROM ainova_teljesitmeny 
    GROUP BY datum 
    ORDER BY datum DESC
  `);
  console.table(t.recordset);
  
  await pool.close();
}

main().catch(console.error);
