const sql = require('mssql');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

(async () => {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: true, trustServerCertificate: true }
  });
  
  console.log('=== HETI TERV tipus_kod ===');
  const r = await pool.request().query('SELECT TOP 5 tipus_kod FROM ainova_heti_terv');
  r.recordset.forEach(x => console.log('  [' + x.tipus_kod + ']'));
  
  console.log('\n=== NORMAK tipus_kod ===');
  const r2 = await pool.request().query("SELECT TOP 5 tipus_kod FROM ainova_termek_normak WHERE tipus_kod LIKE 'B861%'");
  r2.recordset.forEach(x => console.log('  [' + x.tipus_kod + ']'));
  
  console.log('\n=== JOIN TESZT ===');
  const r3 = await pool.request().query(`
    SELECT TOP 5 
      ht.tipus_kod AS heti_terv_tipus,
      tn.tipus_kod AS norma_tipus,
      ISNULL(tn.osszeg_normido_perc, 0) AS norma_perc
    FROM ainova_heti_terv ht
    LEFT JOIN ainova_termek_normak tn ON ht.tipus_kod = tn.tipus_kod
  `);
  r3.recordset.forEach(x => console.log('  HT:[' + x.heti_terv_tipus + '] -> TN:[' + x.norma_tipus + '] = ' + x.norma_perc));
  
  await pool.close();
})();
