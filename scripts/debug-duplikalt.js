/**
 * Debug - Hol vannak a duplikált C típusok az Excelben
 */

const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['CW03 ütemterv'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function normalizeTipusKod(kod) {
  if (!kod) return '';
  return String(kod).replace(/\s+/g, '');
}

console.log('=== C62330A130B52S1 ELŐFORDULÁSAI ===');
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  // Ellenőrizzük az összes oszlopot
  for (let col = 0; col < Math.min(row.length, 30); col++) {
    const cellValue = String(row[col] || '').trim();
    const normalized = normalizeTipusKod(cellValue);
    
    if (normalized === 'C62330A130B52S1') {
      console.log(`Row ${i}, Col ${col}: "${cellValue}"`);
      console.log(`  Környező cellák: [${row.slice(Math.max(0, col-2), col+5).join(' | ')}]`);
    }
  }
}

console.log('\n=== ÖSSZES C TÍPUS INDEX 13 (N oszlop) ===');
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  const tipusKod = normalizeTipusKod(String(row[13] || ''));
  if (tipusKod.startsWith('C')) {
    const igenyDb = row[19];
    console.log(`Row ${i}: ${tipusKod} - Heti igény: ${igenyDb}`);
  }
}
