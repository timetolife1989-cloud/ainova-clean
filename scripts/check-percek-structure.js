const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

const sh = wb.Sheets['Percek'];
const data = XLSX.utils.sheet_to_json(sh, { header: 1 });

console.log('=== Percek fül struktúra ===');
console.log('Összes sor:', data.length);

// Keressük meg az összes "LAC szerelő" feliratot
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  const firstCell = String(row[2] || '');
  if (firstCell.includes('LAC szerelő')) {
    console.log(`Row ${i}: "${firstCell}" - Ez egy műszak blokk kezdete!`);
  }
}

// Header sorok keresése (ahol MŰSZAK van)
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  if (String(row[0] || '').toUpperCase().includes('MŰSZAK')) {
    console.log(`Row ${i}: Header sor (MŰSZAK)`);
  }
}
