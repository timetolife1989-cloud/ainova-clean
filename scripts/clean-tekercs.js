/**
 * Töröl minden TEKERCS rekordot és újrafuttatja a sync-et
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
  
  // Töröljük MINDEN TEKERCS rekordot (minden hét, minden év)
  const result = await pool.request().query(`
    DELETE FROM ainova_napi_terv WHERE termek_tipus = 'TEKERCS'
  `);
  
  console.log(`TEKERCS rekordok törölve: ${result.rowsAffected[0]}`);
  pool.close();
}

main().catch(console.error);
