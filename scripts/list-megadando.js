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

  console.log('=== "Megadandó" státuszban lévő operátorok ===\n');
  const r = await pool.request().query(`
    SELECT torzsszam, nev, muszak 
    FROM ainova_operatorok 
    WHERE pozicio = 'Megadandó' 
    ORDER BY nev
  `);
  console.table(r.recordset);

  pool.close();
}

main().catch(console.error);
