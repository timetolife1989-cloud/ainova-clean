/**
 * Debug - Heti Fix Excel részlet elemzés
 */

const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['CW03 ütemterv'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== HEADER ROW (1) ===');
console.log('Index 13-24:');
const headerRow = data[1];
if (headerRow) {
  for (let i = 13; i <= 24; i++) {
    console.log(`  [${i}]: "${headerRow[i] || ''}"`);
  }
}

console.log('\n=== ELSŐ 10 C TÍPUSÚ SOR ===');
let cCount = 0;
for (let i = 2; i < data.length && cCount < 10; i++) {
  const row = data[i];
  if (!row) continue;
  
  const tipusKod = String(row[13] || '').trim().replace(/\s+/g, '');
  if (!tipusKod || !tipusKod.startsWith('C')) continue;
  if (tipusKod.toLowerCase().includes('sum')) break;
  
  console.log(`\nRow ${i}: ${tipusKod}`);
  console.log(`  [19] Heti Igény db: ${row[19]}`);
  console.log(`  [20] Heti Igény perc: ${row[20]}`);
  console.log(`  [14-18] Leadott: ${[row[14], row[15], row[16], row[17], row[18]]}`);
  
  cCount++;
}

console.log('\n=== C62330A130B52S1 KERESÉSE ===');
for (let i = 2; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  const tipusKod = String(row[13] || '').trim().replace(/\s+/g, '');
  if (tipusKod === 'C62330A130B52S1') {
    console.log(`Megtalálva Row ${i}:`);
    for (let j = 13; j <= 24; j++) {
      console.log(`  [${j}]: ${row[j]}`);
    }
    break;
  }
}
