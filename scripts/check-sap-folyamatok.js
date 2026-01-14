const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: { encrypt: true, trustServerCertificate: true }
  });
  
  // Először nézzük meg milyen oszlopok vannak
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ainova_sap_folyamatok' 
    ORDER BY ORDINAL_POSITION
  `);
  console.log('Oszlopok:', cols.recordset.map(x => x.COLUMN_NAME).join(', '));
  
  const r = await pool.request().query(`
    SELECT * FROM ainova_sap_folyamatok ORDER BY id
  `);
  
  console.log('=== SAP FOLYAMATOK ===');
  console.table(r.recordset);
  
  // Kategóriánként csoportosítva
  const kategoriak = {};
  r.recordset.forEach(row => {
    const kat = row.kategoria_kod || 'EGYEB';
    if (!kategoriak[kat]) kategoriak[kat] = [];
    kategoriak[kat].push({ kod: row.kod, nev: row.nev });
  });
  
  console.log('\n=== KATEGÓRIÁNKÉNT ===');
  for (const [kat, folyamatok] of Object.entries(kategoriak)) {
    console.log(`\n${kat}:`);
    folyamatok.forEach(f => console.log(`  ${f.kod}: ${f.nev}`));
  }
  
  pool.close();
}

main().catch(console.error);
