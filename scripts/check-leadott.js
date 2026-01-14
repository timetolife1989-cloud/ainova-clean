const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
  const pool = await sql.connect(config);
  
  const result = await pool.request().query(`
    SELECT tipus_kod, datum, igeny_db, leadott_db, kulonbseg_db 
    FROM dbo.ainova_napi_terv 
    WHERE datum = '2026-01-12' 
    ORDER BY tipus_kod
  `);
  
  console.log('2026-01-12 (Hétfő) - Igény vs Leadott:');
  result.recordset.forEach(r => {
    console.log(r.tipus_kod + ' | igény:' + r.igeny_db + ' leadott:' + r.leadott_db + ' diff:' + r.kulonbseg_db);
  });
  
  await pool.close();
}
run().catch(console.error);
