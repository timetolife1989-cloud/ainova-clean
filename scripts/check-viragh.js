const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

const sh = wb.Sheets['Percek'];
const data = XLSX.utils.sheet_to_json(sh, { header: 1 });

// Find Virágh Roland
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  if (String(row[3]).includes('30014683')) {
    console.log('=== Virágh Roland (Row', i, ') ===');
    console.log('Header (row 1):');
    for (let j = 0; j < 25; j++) {
      console.log(`Col ${j}: header="${data[1]?.[j]}" | value="${row[j]}"`);
    }
    break;
  }
}
