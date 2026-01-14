// Összehasonlítás: kategória tábla vs teljesítmény tábla
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};

async function main() {
  const pool = await sql.connect(config);
  
  // 2026-01-13 napi összesítés - KATEGÓRIA TÁBLA
  const r = await pool.request().query(`
    SELECT 
      FORMAT(datum, 'yyyy-MM-dd') AS datum,
      SUM(leadott_perc) AS ossz_perc
    FROM ainova_napi_kategoria_perc 
    WHERE datum = '2026-01-13'
    GROUP BY datum
  `);
  console.log('=== 2026-01-13 ===');
  console.log('Kategória tábla összesen:', Math.round(r.recordset[0]?.ossz_perc || 0), 'perc');
  
  // Teljesítmény tábla
  const t = await pool.request().query(`
    SELECT 
      FORMAT(datum, 'yyyy-MM-dd') AS datum,
      SUM(leadott_perc) AS ossz_perc
    FROM ainova_teljesitmeny 
    WHERE datum = '2026-01-13'
    GROUP BY datum
  `);
  console.log('Teljesítmény tábla összesen:', Math.round(t.recordset[0]?.ossz_perc || 0), 'perc');
  
  // Részletes bontás kategóriánként
  const details = await pool.request().query(`
    SELECT 
      kategoria_kod,
      CAST(leadott_perc AS INT) AS perc
    FROM ainova_napi_kategoria_perc 
    WHERE datum = '2026-01-13'
    ORDER BY leadott_perc DESC
  `);
  
  console.log('\n=== Kategóriák bontása ===');
  console.table(details.recordset);
  
  pool.close();
}

main().catch(console.error);
