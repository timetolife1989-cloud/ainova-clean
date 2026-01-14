/**
 * Gyors tábla check
 */
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: { encrypt: false, trustServerCertificate: true },
};

async function check() {
  console.log('DB:', process.env.DB_SERVER, '/', process.env.DB_NAME);
  
  const pool = await sql.connect(config);
  
  // Összes tábla
  const allTables = await pool.request().query(`
    SELECT name FROM sys.tables ORDER BY name
  `);
  
  console.log('\nÖsszes tábla:');
  console.table(allTables.recordset);
  
  await pool.close();
}

check();
