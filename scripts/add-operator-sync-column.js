// Hozzáadjuk a last_operator_sync_at oszlopot
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  // Ellenőrizzük létezik-e az oszlop
  const check = await pool.request().query(`
    SELECT COUNT(*) as cnt FROM sys.columns 
    WHERE object_id = OBJECT_ID('ainova_import_status') 
    AND name = 'last_operator_sync_at'
  `);

  if (check.recordset[0].cnt === 0) {
    await pool.request().query(`
      ALTER TABLE ainova_import_status 
      ADD last_operator_sync_at DATETIME NULL
    `);
    console.log('✓ last_operator_sync_at oszlop hozzáadva');
  } else {
    console.log('✓ last_operator_sync_at oszlop már létezik');
  }

  pool.close();
}

main().catch(console.error);
