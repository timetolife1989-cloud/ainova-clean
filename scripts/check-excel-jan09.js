const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Filter létszám fül - F1L operátorok
const fsh = wb.Sheets['Filter létszám'];
const fdata = XLSX.utils.sheet_to_json(fsh, { header: 1 });

const f1lOps = new Map();
for (let i = 1; i < fdata.length; i++) {
  const r = fdata[i];
  if (!r) continue;
  const muszak = String(r[0] || '').trim().toUpperCase();
  const vsz = String(r[1] || '').trim();
  const mt = String(r[11] || '').trim().toUpperCase();
  
  if (mt === 'F1L' && vsz.length >= 5 && (muszak === 'A/L' || muszak === 'B/L' || muszak === 'C/L')) {
    f1lOps.set(vsz, muszak.replace('/L', ''));
  }
}
console.log('=== Filter létszám - F1L (A/L, B/L, C/L) ===');
console.log('Összes F1L operátor:', f1lOps.size);

// 2. Percek fül - 01.09 adatok
const psh = wb.Sheets['Percek'];
const pdata = XLSX.utils.sheet_to_json(psh, { header: 1 });

// Header keresése
let hdrRow = 1;
let vszCol = 3;  // VSZ = D oszlop = index 3

// 01.09 oszlop = 20
const jan09Col = 20;
console.log('\n01.09 oszlop:', jan09Col);

// Operátorok 01.09 percekkel
let cnt = 0, sum = 0;
const found = [];
for (let i = hdrRow + 1; i < pdata.length; i++) {
  const r = pdata[i];
  if (!r) continue;
  const vsz = String(r[vszCol] || '').trim();
  
  if (!f1lOps.has(vsz)) continue;
  
  const perc = Number(r[jan09Col] || 0);
  if (perc > 0) {
    cnt++;
    sum += perc;
    found.push({ vsz, muszak: f1lOps.get(vsz), perc: Math.round(perc) });
  }
}

console.log('\n=== 2026-01-09 F1L operátorok >0 perc ===');
console.log('Létszám:', cnt, '| Össz perc:', Math.round(sum));

const byM = { A: 0, B: 0, C: 0 };
found.forEach(o => { byM[o.muszak] = (byM[o.muszak] || 0) + 1; });
console.log('\nMűszak bontás:');
console.table(byM);

console.log('\n=== SQL vs Excel összehasonlítás ===');
console.log('SQL:   A=12, B=15, C=19, Össz=46, Perc=21550');
console.log('Excel:', `A=${byM.A}, B=${byM.B}, C=${byM.C}, Össz=${cnt}, Perc=${Math.round(sum)}`);
