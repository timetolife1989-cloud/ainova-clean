/**
 * Kategória tábla bővítése műszak oszloppal
 * ===========================================
 * 
 * Futtatás: node scripts/add-muszak-to-kategoria.js
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
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function migrate() {
  console.log('================================================');
  console.log('  AINOVA - Kategória tábla műszak bővítés');
  console.log('================================================\n');

  const pool = await sql.connect(config);

  // 1. Ellenőrizzük, hogy létezik-e már a muszak oszlop
  const checkCol = await pool.query(`
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ainova_napi_kategoria_perc' AND COLUMN_NAME = 'muszak'
  `);

  if (checkCol.recordset.length > 0) {
    console.log('✅ A muszak oszlop már létezik - nincs teendő');
    await pool.close();
    return;
  }

  console.log('📋 Lépések:');
  console.log('  1. Új muszak oszlop hozzáadása');
  console.log('  2. Unique constraint frissítése');
  console.log('  3. Index létrehozása\n');

  // 2. Régi unique constraint törlése
  console.log('🔧 Régi constraint törlése...');
  try {
    await pool.query(`
      ALTER TABLE ainova_napi_kategoria_perc 
      DROP CONSTRAINT IF EXISTS UQ_napi_kat
    `);
  } catch (e) {
    // Constraint nem létezik - OK
  }

  // 3. Muszak oszlop hozzáadása
  console.log('🔧 Muszak oszlop hozzáadása...');
  await pool.query(`
    ALTER TABLE ainova_napi_kategoria_perc 
    ADD muszak NVARCHAR(5) NOT NULL DEFAULT 'SUM'
  `);

  // 4. Új unique constraint (datum + kategoria + muszak)
  console.log('🔧 Új unique constraint létrehozása...');
  await pool.query(`
    ALTER TABLE ainova_napi_kategoria_perc 
    ADD CONSTRAINT UQ_napi_kat_muszak UNIQUE (datum, kategoria_kod, muszak)
  `);

  // 5. Index a műszakra
  console.log('🔧 Index létrehozása...');
  await pool.query(`
    CREATE INDEX IX_nkp_muszak ON ainova_napi_kategoria_perc(muszak)
  `);

  // 6. Ellenőrzés
  const verify = await pool.query(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ainova_napi_kategoria_perc'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('\n✅ Tábla struktúra frissítve:\n');
  console.table(verify.recordset);

  await pool.close();
  
  console.log('\n================================================');
  console.log('  KÉSZ! Futtasd újra a sync scriptet:');
  console.log('  node scripts/sync-perc-sap-kategoriak.js');
  console.log('================================================\n');
}

migrate().catch(err => {
  console.error('❌ Hiba:', err.message);
  process.exit(1);
});
