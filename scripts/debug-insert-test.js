/**
 * Debug - TEKERCS INSERT teszt egyetlen rekorddal
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const DB_CONFIG = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true }
};

async function main() {
  const pool = await sql.connect(DB_CONFIG);
  
  // Teszt értékek - pontosan mint a sync-heti-fix.js-ben
  const hetSzam = 3;
  const ev = 2026;
  const tipusKod = 'C62330A130B52S1';
  const termekTipus = 'TEKERCS';
  const datum = '2026-01-12';
  const napiIgenyDb = 320;  // Ez kellene legyen!
  const leadottDb = 0;
  
  console.log('=== TESZT INSERT ===');
  console.log(`tipus_kod: ${tipusKod}`);
  console.log(`igeny_db: ${napiIgenyDb} (type: ${typeof napiIgenyDb})`);
  
  // Előbb töröljük ha van
  await pool.request()
    .input('tipus_kod', sql.NVarChar, tipusKod)
    .input('datum', sql.Date, datum)
    .query('DELETE FROM ainova_napi_terv WHERE tipus_kod = @tipus_kod AND datum = @datum');
  
  // Most INSERT (nem MERGE)
  const result = await pool.request()
    .input('het_szam', sql.Int, hetSzam)
    .input('ev', sql.Int, ev)
    .input('tipus_kod', sql.NVarChar, tipusKod)
    .input('termek_tipus', sql.NVarChar, termekTipus)
    .input('datum', sql.Date, datum)
    .input('igeny_db', sql.Int, napiIgenyDb)
    .input('leadott_db', sql.Int, leadottDb)
    .query(`
      INSERT INTO dbo.ainova_napi_terv 
        (het_szam, ev, tipus_kod, termek_tipus, datum, igeny_db, leadott_db)
      VALUES 
        (@het_szam, @ev, @tipus_kod, @termek_tipus, @datum, @igeny_db, @leadott_db)
    `);
  
  console.log(`INSERT result: ${result.rowsAffected[0]} row`);
  
  // Ellenőrzés
  const check = await pool.request()
    .input('tipus_kod', sql.NVarChar, tipusKod)
    .input('datum', sql.Date, datum)
    .query('SELECT * FROM ainova_napi_terv WHERE tipus_kod = @tipus_kod AND datum = @datum');
  
  console.log('\n=== Eredmény a DB-ben ===');
  console.table(check.recordset);
  
  pool.close();
}

main().catch(console.error);
