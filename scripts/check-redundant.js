// Redundáns operátorok keresése - SQL vs Excel
const sql = require('mssql');
const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  // 1. Excel operátorok beolvasása
  const buf = fs.readFileSync('\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const filterSheet = wb.Sheets['Filter létszám'];
  const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 });

  const excelOperators = new Set();
  for (let i = 1; i < filterData.length; i++) {
    const row = filterData[i];
    if (!row) continue;
    const muszak = String(row[0] || '').trim().toUpperCase();
    const vsz = String(row[1] || '').trim();
    const munkaterulet = String(row[11] || '').trim().toUpperCase();
    if (munkaterulet === 'F1L' && (muszak === 'A/L' || muszak === 'B/L' || muszak === 'C/L')) {
      excelOperators.add(vsz);
    }
  }
  console.log(`Excel F1L operátorok: ${excelOperators.size}`);

  // 2. SQL operátorok lekérdezése
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  const result = await pool.request().query(`
    SELECT torzsszam, nev, muszak, aktiv 
    FROM ainova_operatorok 
    ORDER BY nev
  `);

  const sqlOperators = result.recordset;
  console.log(`SQL ainova_operatorok: ${sqlOperators.length}`);

  // 3. Összehasonlítás
  const inBoth = [];
  const onlyInSql = [];
  const onlyInExcel = [];

  for (const op of sqlOperators) {
    if (excelOperators.has(op.torzsszam)) {
      inBoth.push(op);
    } else {
      onlyInSql.push(op);
    }
  }

  for (const vsz of excelOperators) {
    const found = sqlOperators.find(o => o.torzsszam === vsz);
    if (!found) {
      onlyInExcel.push(vsz);
    }
  }

  console.log(`\n=== EREDMÉNY ===`);
  console.log(`Mindkettőben: ${inBoth.length}`);
  console.log(`CSAK SQL-ben (redundáns/régi): ${onlyInSql.length}`);
  console.log(`CSAK Excelben (még nincs importálva): ${onlyInExcel.length}`);

  if (onlyInSql.length > 0) {
    console.log(`\n=== REDUNDÁNS - Csak SQL-ben van (${onlyInSql.length} fő) ===`);
    // Műszak szerinti bontás
    const byMuszak = { A: [], B: [], C: [], other: [] };
    for (const op of onlyInSql) {
      if (op.muszak === 'A') byMuszak.A.push(op);
      else if (op.muszak === 'B') byMuszak.B.push(op);
      else if (op.muszak === 'C') byMuszak.C.push(op);
      else byMuszak.other.push(op);
    }
    console.log(`  A műszak: ${byMuszak.A.length}`);
    console.log(`  B műszak: ${byMuszak.B.length}`);
    console.log(`  C műszak: ${byMuszak.C.length}`);
    if (byMuszak.other.length > 0) console.log(`  Egyéb: ${byMuszak.other.length}`);
    
    // Első 10 példa
    console.log(`\n  Példák (első 10):`);
    onlyInSql.slice(0, 10).forEach(op => {
      console.log(`    ${op.torzsszam} - ${op.nev} (${op.muszak}) - aktív: ${op.aktiv ? 'IGEN' : 'NEM'}`);
    });
  }

  if (onlyInExcel.length > 0) {
    console.log(`\n=== HIÁNYZIK SQL-ből (${onlyInExcel.length} fő) ===`);
    onlyInExcel.forEach(vsz => console.log(`  ${vsz}`));
  }

  pool.close();
}

main().catch(console.error);
