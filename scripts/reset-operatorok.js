// Operátorok tábla tisztítása és újratöltése az Excel alapján
const sql = require('mssql');
const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  // 1. Excel operátorok beolvasása
  console.log('Excel beolvasása...');
  const buf = fs.readFileSync('\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const filterSheet = wb.Sheets['Filter létszám'];
  const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 });

  const excelOperators = new Map();
  for (let i = 1; i < filterData.length; i++) {
    const row = filterData[i];
    if (!row) continue;
    const muszakRaw = String(row[0] || '').trim().toUpperCase();
    const vsz = String(row[1] || '').trim();
    const nev = String(row[4] || '').trim();
    const munkaterulet = String(row[11] || '').trim().toUpperCase();
    
    if (munkaterulet === 'F1L' && (muszakRaw === 'A/L' || muszakRaw === 'B/L' || muszakRaw === 'C/L')) {
      const muszak = muszakRaw.replace('/L', '');
      excelOperators.set(vsz, { vsz, nev, muszak });
    }
  }
  console.log(`Excel F1L operátorok: ${excelOperators.size}`);

  // 2. SQL kapcsolat
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  // 3. Jelenlegi SQL adatok
  const current = await pool.request().query('SELECT torzsszam FROM ainova_operatorok');
  console.log(`Jelenlegi SQL operátorok: ${current.recordset.length}`);

  // 4. Tábla törlése
  console.log('\nTábla tartalom törlése...');
  await pool.request().query('DELETE FROM ainova_operatorok');
  console.log('Törölve.');

  // 5. Újratöltés Excelből
  console.log('\nÚjratöltés Excelből...');
  let inserted = 0;
  let nextId = 1;
  
  for (const [vsz, op] of excelOperators) {
    try {
      await pool.request()
        .input('id', sql.Int, nextId++)
        .input('torzsszam', sql.NVarChar(50), vsz)
        .input('nev', sql.NVarChar(100), op.nev)
        .input('muszak', sql.NVarChar(10), op.muszak)
        .query(`
          INSERT INTO ainova_operatorok (id, torzsszam, nev, muszak, pozicio, aktiv)
          VALUES (@id, @torzsszam, @nev, @muszak, 'Megadandó', 1)
        `);
      inserted++;
    } catch (err) {
      console.error(`Hiba ${vsz} beszúrásakor:`, err.message);
    }
  }

  console.log(`\n=== KÉSZ ===`);
  console.log(`Beszúrva: ${inserted} operátor`);

  // 6. Ellenőrzés
  const after = await pool.request().query(`
    SELECT COUNT(*) as osszes,
      SUM(CASE WHEN muszak='A' THEN 1 ELSE 0 END) as A,
      SUM(CASE WHEN muszak='B' THEN 1 ELSE 0 END) as B,
      SUM(CASE WHEN muszak='C' THEN 1 ELSE 0 END) as C
    FROM ainova_operatorok
  `);
  console.log('\nÚj állapot:');
  console.table(after.recordset);

  pool.close();
}

main().catch(console.error);
