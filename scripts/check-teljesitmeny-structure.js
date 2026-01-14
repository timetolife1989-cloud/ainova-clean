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

  console.log('=== ainova_teljesitmeny tábla oszlopai ===');
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ainova_teljesitmeny' 
    ORDER BY ORDINAL_POSITION
  `);
  console.table(cols.recordset);

  console.log('\n=== Minta rekordok (top 5) ===');
  const sample = await pool.request().query(`
    SELECT TOP 5 * FROM ainova_teljesitmeny ORDER BY datum DESC
  `);
  console.table(sample.recordset);

  console.log('\n=== Van-e "tipus" vagy "folyamat" oszlop? ===');
  const hasTipus = cols.recordset.some(c => c.COLUMN_NAME.toLowerCase().includes('tipus') || c.COLUMN_NAME.toLowerCase().includes('folyamat'));
  console.log(hasTipus ? 'IGEN - van ilyen oszlop!' : 'NEM - nincs ilyen oszlop');

  pool.close();
}

main().catch(console.error);
