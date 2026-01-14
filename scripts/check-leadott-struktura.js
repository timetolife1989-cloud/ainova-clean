/**
 * Ellenőrizzük a leadott perc struktúráját
 * - Hogyan kapcsolódik a munkahely kód a kategóriákhoz
 */

const sql = require('mssql');

const config = {
  server: 'sveeadb02.tdk-prod.net',
  database: 'AICG',
  user: 'aicg_user',
  password: 'AiCg2024!',
  options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
  const pool = await sql.connect(config);
  
  // 1. SAP folyamatok - munkahely kódok minta
  console.log('=== SAP FOLYAMATOK - munkahely_kodok minták ===');
  const sap = await pool.request().query(`
    SELECT TOP 10 kategoria_kod, sap_nev, munkahely_kodok
    FROM ainova_sap_folyamatok
    WHERE munkahely_kodok IS NOT NULL AND munkahely_kodok != ''
    ORDER BY kategoria_kod
  `);
  console.table(sap.recordset);
  
  // 2. Teljesítmény tábla struktúra
  console.log('\n=== TELJESÍTMÉNY TÁBLA OSZLOPOK ===');
  const cols = await pool.request().query(`
    SELECT TOP 1 * FROM ainova_teljesitmeny
  `);
  console.log(Object.keys(cols.recordset[0] || {}).join(', '));
  
  // 3. Van-e munkahely adat a teljesítmény táblában?
  console.log('\n=== TELJESÍTMÉNY MINTA ===');
  const sample = await pool.request().query(`
    SELECT TOP 5 * FROM ainova_teljesitmeny ORDER BY datum DESC
  `);
  console.table(sample.recordset);
  
  // 4. Összes tábla listázása - keresünk munkahely kapcsolatot
  console.log('\n=== TÁBLÁK amikben munkahely lehet ===');
  const tables = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE'
    AND (TABLE_NAME LIKE '%munkahely%' OR TABLE_NAME LIKE '%perc%' OR TABLE_NAME LIKE '%sap%')
    ORDER BY TABLE_NAME
  `);
  tables.recordset.forEach(t => console.log(t.TABLE_NAME));
  
  // 5. Van-e részletes leadott perc tábla?
  console.log('\n=== KERESÉS: részletes perc táblák ===');
  const percTables = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME LIKE '%perc%' OR COLUMN_NAME LIKE '%munkahely%'
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  console.table(percTables.recordset);
  
  pool.close();
}

check().catch(console.error);
