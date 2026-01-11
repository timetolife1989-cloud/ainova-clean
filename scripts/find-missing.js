const XLSX = require('xlsx');
const fs = require('fs');
const sql = require('mssql');
require('dotenv').config({path:'.env.local'});

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

async function main() {
  const buf = fs.readFileSync(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer' });

  // 1. Filter létszám - F1L operátorok
  const fsh = wb.Sheets['Filter létszám'];
  const fdata = XLSX.utils.sheet_to_json(fsh, { header: 1 });
  const f1lOps = new Map();
  for (let i = 1; i < fdata.length; i++) {
    const r = fdata[i];
    if (!r) continue;
    const muszak = String(r[0] || '').trim().toUpperCase();
    const vsz = String(r[1] || '').trim();
    const nev = String(r[4] || '').trim();
    const mt = String(r[11] || '').trim().toUpperCase();
    if (mt === 'F1L' && vsz.length >= 5 && (muszak === 'A/L' || muszak === 'B/L' || muszak === 'C/L')) {
      f1lOps.set(vsz, { muszak: muszak.replace('/L', ''), nev });
    }
  }

  // 2. Percek fül - 01.09 adatok
  const psh = wb.Sheets['Percek'];
  const pdata = XLSX.utils.sheet_to_json(psh, { header: 1 });
  const jan09Col = 20;
  const vszCol = 3;
  const hdrRow = 1;

  const excelOps = new Map();
  for (let i = hdrRow + 1; i < pdata.length; i++) {
    const r = pdata[i];
    if (!r) continue;
    const vsz = String(r[vszCol] || '').trim();
    if (!f1lOps.has(vsz)) continue;
    const perc = Number(r[jan09Col] || 0);
    if (perc > 0) {
      excelOps.set(vsz, { ...f1lOps.get(vsz), perc: Math.round(perc) });
    }
  }

  // 3. SQL-ből 01.09 operátorok
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  const sqlResult = await pool.request().query(`
    SELECT torzsszam, nev, muszak, leadott_perc
    FROM ainova_teljesitmeny 
    WHERE CONVERT(VARCHAR(10), datum, 23) = '2026-01-09'
  `);
  
  const sqlOps = new Set();
  sqlResult.recordset.forEach(r => sqlOps.add(r.torzsszam));

  // 4. Hiányzók
  console.log('=== Excel-ben van, SQL-ben NINCS (01.09) ===');
  const missing = [];
  for (const [vsz, data] of excelOps) {
    if (!sqlOps.has(vsz)) {
      missing.push({ vsz, ...data });
    }
  }
  console.table(missing);
  console.log('Hiányzó operátorok:', missing.length);

  pool.close();
}
main().catch(console.error);
