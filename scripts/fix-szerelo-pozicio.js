const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function fixSzereloPozicio() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  console.log('=== Szerelő → LaC szerelő átírás ===\n');

  // Előtte
  const before = await pool.request().query(`
    SELECT COUNT(*) as db FROM ainova_operatorok WHERE pozicio = 'Szerelő'
  `);
  console.log(`Szerelő pozícióval rendelkezők (előtte): ${before.recordset[0].db} fő`);

  // UPDATE
  const result = await pool.request().query(`
    UPDATE ainova_operatorok 
    SET pozicio = 'LaC szerelő', updated_at = GETDATE() 
    WHERE pozicio = 'Szerelő'
  `);
  console.log(`\nMódosított sorok: ${result.rowsAffected[0]}`);

  // Ellenőrzés
  console.log('\n=== Pozíciók eloszlása ===');
  const check = await pool.request().query(`
    SELECT pozicio, COUNT(*) as db 
    FROM ainova_operatorok 
    WHERE pozicio != 'Megadandó' 
    GROUP BY pozicio 
    ORDER BY db DESC
  `);
  console.table(check.recordset);

  await pool.close();
}

fixSzereloPozicio().catch(console.error);
