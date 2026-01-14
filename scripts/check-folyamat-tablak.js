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

  console.log('=== AINOVA TÁBLÁK ===');
  const tables = await pool.request().query(`
    SELECT name FROM sys.tables WHERE name LIKE 'ainova%' ORDER BY name
  `);
  tables.recordset.forEach(r => console.log(' -', r.name));

  console.log('\n=== FOLYAMAT KATEGÓRIÁK ===');
  try {
    const kat = await pool.request().query(`
      SELECT kod, nev, sorrend FROM ainova_folyamat_kategoriak ORDER BY sorrend
    `);
    console.table(kat.recordset);
  } catch (e) {
    console.log('Nincs ainova_folyamat_kategoriak tábla!');
  }

  console.log('\n=== SAP FOLYAMATOK PER KATEGÓRIA ===');
  try {
    const sap = await pool.request().query(`
      SELECT kategoria_kod, COUNT(*) as db 
      FROM ainova_sap_folyamatok 
      GROUP BY kategoria_kod 
      ORDER BY kategoria_kod
    `);
    console.table(sap.recordset);
  } catch (e) {
    console.log('Nincs ainova_sap_folyamatok tábla!');
  }

  console.log('\n=== TERMÉK SAP IDŐK (van-e adat?) ===');
  try {
    const tid = await pool.request().query(`
      SELECT TOP 3 * FROM ainova_termek_sap_idok
    `);
    console.log('Rekordok:', tid.recordset.length > 0 ? 'VAN ADAT' : 'ÜRES');
    if (tid.recordset.length > 0) console.table(tid.recordset);
  } catch (e) {
    console.log('Nincs ainova_termek_sap_idok tábla!');
  }

  pool.close();
}

check().catch(console.error);
