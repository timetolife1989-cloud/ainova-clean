const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

const sh = wb.Sheets['Percek'];
const data = XLSX.utils.sheet_to_json(sh, { header: 1 });
const hdr = data[1];

console.log('=== Percek fül összes dátum oszlop ===');
for (let j = 4; j < hdr.length; j++) {
  const v = hdr[j];
  console.log(`Col ${j}: "${v}"`);
}
