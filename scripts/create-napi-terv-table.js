/**
 * Létrehozza az ainova_napi_terv táblát
 */
const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
  const pool = await sql.connect(config);
  
  // Új tábla a napi terv + leadott adatoknak
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ainova_napi_terv')
    CREATE TABLE dbo.ainova_napi_terv (
      id INT IDENTITY(1,1) PRIMARY KEY,
      ev INT NOT NULL,
      het_szam INT NOT NULL,
      datum DATE NOT NULL,
      tipus_kod NVARCHAR(50) NOT NULL,
      termek_tipus NVARCHAR(20),
      igeny_db INT DEFAULT 0,
      igeny_perc DECIMAL(10,2) DEFAULT 0,
      leadott_db INT DEFAULT 0,
      norma_perc DECIMAL(10,2) DEFAULT 0,
      kulonbseg_db AS (igeny_db - leadott_db),
      forras_sheet NVARCHAR(50),
      utolso_szinkron DATETIME2 DEFAULT SYSDATETIME(),
      created_at DATETIME2 DEFAULT SYSDATETIME(),
      updated_at DATETIME2 DEFAULT SYSDATETIME(),
      UNIQUE(ev, het_szam, datum, tipus_kod)
    );
  `);
  
  console.log('✅ ainova_napi_terv tábla létrehozva');
  
  await pool.close();
}
run().catch(console.error);
