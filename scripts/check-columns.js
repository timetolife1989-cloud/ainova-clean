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
  
  const r = await pool.request().query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ainova_termek_normak' 
    ORDER BY ORDINAL_POSITION
  `);
  
  console.log('Oszlopok:', r.recordset.map(x => x.COLUMN_NAME).join(', '));
  pool.close();
}

main().catch(console.error);
