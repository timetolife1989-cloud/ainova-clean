const sql = require('mssql');
require('dotenv').config({path:'.env.local'});

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });
  
  console.log('=== KÖZÖS napok WarRoom + Teljesítmény ===');
  const both = await pool.request().query(\`
    SELECT CONVERT(VARCHAR(10), t.datum, 23) as datum,
           COUNT(DISTINCT t.torzsszam) as telj_letszam,
           wr.netto
    FROM ainova_teljesitmeny t
    INNER JOIN (
      SELECT CONVERT(VARCHAR(10), Datum, 23) as datum, SUM(NettoLetszam) as netto
      FROM WarRoomLetszam
      GROUP BY Datum
    ) wr ON CONVERT(VARCHAR(10), t.datum, 23) = wr.datum
    WHERE t.datum < CAST(GETDATE() AS DATE)
    GROUP BY t.datum, wr.netto
    HAVING SUM(t.leadott_perc) >= 1000
    ORDER BY t.datum DESC
  \`);
  console.table(both.recordset);
  
  pool.close();
}
main().catch(console.error);
