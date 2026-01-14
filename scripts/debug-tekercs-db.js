/**
 * Debug - TEKERCS igeny_db ellenőrzés közvetlenül mentés után
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
  
  // C62330A130B52S1 összes adata
  const result = await pool.request().query(`
    SELECT tipus_kod, datum, igeny_db, leadott_db, termek_tipus 
    FROM ainova_napi_terv 
    WHERE tipus_kod = 'C62330A130B52S1'
    ORDER BY datum
  `);
  
  console.log('=== C62330A130B52S1 adatok a DB-ben ===');
  console.table(result.recordset);
  
  // TEKERCS összesen
  const tekercs = await pool.request().query(`
    SELECT tipus_kod, SUM(igeny_db) as ossz_igeny_db 
    FROM ainova_napi_terv 
    WHERE termek_tipus = 'TEKERCS'
    GROUP BY tipus_kod
    ORDER BY ossz_igeny_db DESC
  `);
  
  console.log('\n=== Összes TEKERCS típus igény ===');
  console.table(tekercs.recordset);
  
  pool.close();
}

main().catch(console.error);
