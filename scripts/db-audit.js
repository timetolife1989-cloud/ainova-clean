/**
 * AINOVA Adatbázis Audit
 * - Táblák listázása
 * - Oszlopok
 * - Átfedések keresése
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};

async function analyze() {
  const pool = await sql.connect(config);
  
  // 1. Összes tábla listázása
  console.log('=== AINOVA TÁBLÁK ===');
  const tables = await pool.request().query(`
    SELECT t.name AS TABLE_NAME,
           p.rows AS row_count
    FROM sys.tables t
    JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id < 2
    WHERE t.name LIKE 'ainova%'
    ORDER BY t.name
  `);
  console.table(tables.recordset);
  
  // 2. Tábla oszlopok
  console.log('\n=== OSZLOP STRUKTÚRA ===');
  const columns = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME LIKE 'ainova%'
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  
  const byTable = {};
  columns.recordset.forEach(c => {
    if (!byTable[c.TABLE_NAME]) byTable[c.TABLE_NAME] = [];
    byTable[c.TABLE_NAME].push(c.COLUMN_NAME);
  });
  
  Object.entries(byTable).forEach(([table, cols]) => {
    console.log(`\n${table}:`);
    console.log('  ' + cols.join(', '));
  });
  
  // 3. Minta adatok
  console.log('\n=== MINTA ADATOK ===');
  for (const table of tables.recordset) {
    if (table.row_count > 0) {
      console.log(`\n--- ${table.TABLE_NAME} (${table.row_count} sor) ---`);
      const sample = await pool.request().query(`SELECT TOP 3 * FROM ${table.TABLE_NAME}`);
      if (sample.recordset.length > 0) {
        console.log(Object.keys(sample.recordset[0]).join(' | '));
        sample.recordset.forEach(r => {
          const vals = Object.values(r).map(v => 
            v instanceof Date ? v.toISOString().split('T')[0] : String(v).substring(0, 20)
          );
          console.log(vals.join(' | '));
        });
      }
    }
  }
  
  pool.close();
}

analyze().catch(console.error);
