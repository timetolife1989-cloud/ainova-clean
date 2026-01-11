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
  
  console.log('=== 2026 adatok az SQL-ben ===');
  const r = await pool.request().query(`
    SELECT CONVERT(VARCHAR(10),datum,23) as datum, 
           COUNT(*) as rekordok, 
           MAX(imported_at) as imported_at 
    FROM ainova_teljesitmeny 
    WHERE datum >= '2026-01-01' 
    GROUP BY datum 
    ORDER BY datum
  `);
  console.table(r.recordset);
  
  pool.close();
}
main().catch(console.error);

main().catch(console.error);
