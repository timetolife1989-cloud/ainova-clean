const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { trustServerCertificate: true }
};

async function main() {
  const pool = await sql.connect(config);
  
  // REPLACE-es JOIN teszt
  const r = await pool.request().query(`
    SELECT TOP 5 
      ht.tipus_kod AS heti_tipus,
      tn.tipus_kod AS norma_tipus,
      tn.osszeg_normido_perc AS norma
    FROM ainova_heti_terv ht
    LEFT JOIN ainova_termek_normak tn 
      ON REPLACE(ht.tipus_kod, ' ', '') = REPLACE(tn.tipus_kod, ' ', '')
    WHERE ht.ev = 2026 AND ht.het_szam = 3
  `);
  
  console.log('JOIN eredmeny (REPLACE):');
  r.recordset.forEach(row => {
    console.log(`  HT: [${row.heti_tipus}] -> Norma: ${row.norma || 'NULL'}`);
  });
  
  // Közvetlen egyezés (normalizált kódokkal)
  const r2 = await pool.request().query(`
    SELECT TOP 5 
      ht.tipus_kod,
      tn.osszeg_normido_perc AS norma
    FROM ainova_heti_terv ht
    LEFT JOIN ainova_termek_normak tn ON ht.tipus_kod = tn.tipus_kod
    WHERE ht.ev = 2026 AND ht.het_szam = 3
  `);
  
  console.log('\nKozvetlen egyezes:');
  r2.recordset.forEach(row => {
    console.log(`  [${row.tipus_kod}] -> Norma: ${row.norma || 'NULL'}`);
  });
  
  // Összes típuskód összehasonlítás
  const r3 = await pool.request().query(`
    SELECT COUNT(*) AS match_count
    FROM ainova_heti_terv ht
    INNER JOIN ainova_termek_normak tn ON ht.tipus_kod = tn.tipus_kod
    WHERE ht.ev = 2026 AND ht.het_szam = 3
  `);
  console.log('\nKozvetlen match count:', r3.recordset[0].match_count);
  
  const r4 = await pool.request().query(`
    SELECT COUNT(*) AS match_count
    FROM ainova_heti_terv ht
    INNER JOIN ainova_termek_normak tn 
      ON REPLACE(ht.tipus_kod, ' ', '') = REPLACE(tn.tipus_kod, ' ', '')
    WHERE ht.ev = 2026 AND ht.het_szam = 3
  `);
  console.log('REPLACE match count:', r4.recordset[0].match_count);
  
  await pool.close();
}

main().catch(console.error);
