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

  console.log('=== 1. ADATBÁZIS NAPI TERV - DÁTUMOK ===');
  const dates = await pool.request().query(`
    SELECT DISTINCT CONVERT(VARCHAR(10), datum, 120) as datum
    FROM ainova_napi_terv 
    WHERE het_szam = 3 AND ev = 2026
    ORDER BY datum
  `);
  console.log('Dátumok az adatbázisban:', dates.recordset.map(r => r.datum));

  console.log('\n=== 2. TEKERCS (C) TÍPUSOK ELLENŐRZÉSE ===');
  const tekercs = await pool.request().query(`
    SELECT tipus_kod, termek_tipus, 
           CONVERT(VARCHAR(10), datum, 120) as datum, 
           igeny_db, leadott_db
    FROM ainova_napi_terv 
    WHERE het_szam = 3 AND ev = 2026 AND termek_tipus = 'TEKERCS'
    ORDER BY tipus_kod, datum
  `);
  console.log('Tekercs rekordok:', tekercs.recordset.length);
  // Első pár sor
  console.table(tekercs.recordset.slice(0, 10));

  console.log('\n=== 3. C62330A130B52S1 RÉSZLETEK ===');
  const c62 = await pool.request().query(`
    SELECT tipus_kod, 
           CONVERT(VARCHAR(10), datum, 120) as datum, 
           igeny_db, leadott_db
    FROM ainova_napi_terv 
    WHERE het_szam = 3 AND ev = 2026 AND tipus_kod LIKE 'C62330A130B52S1%'
    ORDER BY datum
  `);
  console.table(c62.recordset);
  
  console.log('\n=== 4. NORMA ELLENŐRZÉS - C típusok ===');
  const normak = await pool.request().query(`
    SELECT TOP 5 
      nt.tipus_kod, 
      n.osszeg_normido_perc,
      n.szereles_perc,
      n.meres_perc,
      n.tekercselés_perc
    FROM ainova_napi_terv nt
    LEFT JOIN ainova_termek_normak n ON nt.tipus_kod = n.tipus_kod
    WHERE nt.het_szam = 3 AND nt.ev = 2026 AND nt.termek_tipus = 'TEKERCS'
    GROUP BY nt.tipus_kod, n.osszeg_normido_perc, n.szereles_perc, n.meres_perc, n.tekercselés_perc
  `);
  console.table(normak.recordset);

  console.log('\n=== 5. HETI ÖSSZESÍTŐ - DB ÉS PERC ===');
  const summary = await pool.request().query(`
    SELECT termek_tipus, 
           SUM(igeny_db) as ossz_igeny_db,
           SUM(leadott_db) as ossz_leadott_db
    FROM ainova_napi_terv 
    WHERE het_szam = 3 AND ev = 2026
    GROUP BY termek_tipus
  `);
  console.table(summary.recordset);

  pool.close();
}

check().catch(console.error);
