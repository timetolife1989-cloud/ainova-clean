// Operátorok statisztika
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

  console.log('=== ainova_operatorok tábla ===');
  const r = await pool.request().query(`
    SELECT 
      COUNT(*) as osszes, 
      SUM(CASE WHEN aktiv=1 THEN 1 ELSE 0 END) as aktiv,
      SUM(CASE WHEN muszak='A' THEN 1 ELSE 0 END) as A,
      SUM(CASE WHEN muszak='B' THEN 1 ELSE 0 END) as B,
      SUM(CASE WHEN muszak='C' THEN 1 ELSE 0 END) as C
    FROM ainova_operatorok
  `);
  console.table(r.recordset);

  console.log('\n=== Honnan jön az adat? ===');
  console.log('Az ainova_operatorok tábla a teljesítmény import során töltődik fel:');
  console.log('- Forrás: PEMC.ver5_2025.07.21.xlsm → "Filter létszám" fül');
  console.log('- Szűrés: munkaterület = F1L és műszak = A/L, B/L vagy C/L');
  console.log('- Az /api/teljesitmeny/import minden futáskor sync-eli az operátorokat');

  console.log('\n=== Excel vs SQL összehasonlítás ===');
  const XLSX = require('xlsx');
  const fs = require('fs');
  const buf = fs.readFileSync('\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const filterSheet = wb.Sheets['Filter létszám'];
  const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 });

  let excelLac = { A: 0, B: 0, C: 0, total: 0 };
  for (let i = 1; i < filterData.length; i++) {
    const row = filterData[i];
    if (!row) continue;
    const muszak = String(row[0] || '').trim().toUpperCase();
    const munkaterulet = String(row[11] || '').trim().toUpperCase();
    if (munkaterulet === 'F1L' && (muszak === 'A/L' || muszak === 'B/L' || muszak === 'C/L')) {
      excelLac.total++;
      if (muszak === 'A/L') excelLac.A++;
      if (muszak === 'B/L') excelLac.B++;
      if (muszak === 'C/L') excelLac.C++;
    }
  }
  console.log('Excel "Filter létszám" (F1L, A/L+B/L+C/L):');
  console.table([excelLac]);

  pool.close();
}

main().catch(console.error);
