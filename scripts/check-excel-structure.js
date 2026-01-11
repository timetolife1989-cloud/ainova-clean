const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('=== Munkalapok ===');
console.log(wb.SheetNames.join(', '));

const psh = wb.Sheets['Percek'];
const pdata = XLSX.utils.sheet_to_json(psh, { header: 1 });

console.log('\n=== Percek fül első 5 sor ===');
for (let i = 0; i < 5; i++) {
  const row = pdata[i];
  if (!row) continue;
  console.log(`Row ${i}:`, row.slice(0, 15).map(c => String(c).substring(0, 15)));
}

// Keressük meg a dátum oszlopokat
console.log('\n=== Dátum oszlopok keresése ===');
for (let i = 0; i < 5; i++) {
  const row = pdata[i];
  if (!row) continue;
  
  const dates = [];
  for (let j = 0; j < row.length; j++) {
    const v = row[j];
    if (typeof v === 'number' && v > 40000 && v < 50000) {
      const d = new Date(Date.UTC(1899, 11, 30));
      d.setUTCDate(d.getUTCDate() + v);
      dates.push({ col: j, date: d.toISOString().split('T')[0] });
    }
  }
  if (dates.length > 0) {
    console.log(`Row ${i} dátumok:`, dates.slice(0, 5), '...', dates.slice(-3));
  }
}
