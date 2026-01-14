const sql = require('mssql');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function check() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    options: { encrypt: true, trustServerCertificate: true }
  });

  console.log('=== TEKERCS TÍPUSONKÉNTI ÖSSZEG ===');
  const r = await pool.request().query(`
    SELECT tipus_kod, SUM(igeny_db) as ossz_igeny_db
    FROM ainova_napi_terv 
    WHERE het_szam = 3 AND ev = 2026 AND termek_tipus = 'TEKERCS'
    GROUP BY tipus_kod 
    ORDER BY ossz_igeny_db DESC
  `);
  console.table(r.recordset);
  
  console.log('\n=== C62330A130B52S1 NAPONTA ===');
  const c = await pool.request().query(`
    SELECT tipus_kod, CONVERT(VARCHAR(10), datum, 120) as datum, igeny_db, leadott_db
    FROM ainova_napi_terv 
    WHERE het_szam = 3 AND ev = 2026 AND tipus_kod = 'C62330A130B52S1'
    ORDER BY datum
  `);
  console.table(c.recordset);

  pool.close();
}

check().catch(console.error);
