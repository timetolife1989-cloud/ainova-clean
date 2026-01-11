const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Filter létszám - F1L operátorok (mint az import)
const filterSheet = wb.Sheets['Filter létszám'];
const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 });

const lacOperators = new Map();

let filterHeaderRow = -1;
for (let i = 0; i < Math.min(5, filterData.length); i++) {
  const row = filterData[i];
  if (row && row.some(cell => String(cell).toUpperCase().includes('MŰSZAK'))) {
    filterHeaderRow = i;
    break;
  }
}
console.log('Filter létszám header row:', filterHeaderRow);

const startRow = filterHeaderRow >= 0 ? filterHeaderRow + 1 : 1;

for (let i = startRow; i < filterData.length; i++) {
  const row = filterData[i];
  if (!row) continue;

  const muszakRaw = String(row[0] || '').trim().toUpperCase();
  const vsz = String(row[1] || '').trim();
  const nev = String(row[4] || '').trim();
  const munkaterulet = String(row[11] || '').trim().toUpperCase();

  if (munkaterulet !== 'F1L') continue;
  if (muszakRaw !== 'A/L' && muszakRaw !== 'B/L' && muszakRaw !== 'C/L') continue;
  if (!vsz || vsz.length < 5) continue;

  const muszak = muszakRaw.replace('/L', '');
  lacOperators.set(vsz, { muszak, vsz, nev, munkaterulet });
}

console.log('LAC operátorok (Filter létszám):', lacOperators.size);

// 2. Percek fül feldolgozása (mint az import)
const percekSheet = wb.Sheets['Percek'];
const percekData = XLSX.utils.sheet_to_json(percekSheet, { header: 1 });

let headerRowIndex = -1;
let colMuszak = -1, colNev = -1, colVsz = -1;

for (let i = 0; i < Math.min(10, percekData.length); i++) {
  const row = percekData[i];
  if (!row) continue;

  for (let j = 0; j < Math.min(20, row.length); j++) {
    const cell = String(row[j] || '').toUpperCase().trim();
    if (cell === 'MŰSZAK') colMuszak = j;
    if (cell === 'NÉV') colNev = j;
    if (cell === 'VSZ') colVsz = j;
  }

  if (colMuszak >= 0 && colNev >= 0 && colVsz >= 0) {
    headerRowIndex = i;
    break;
  }
}

console.log(`Percek header: row=${headerRowIndex}, MŰSZAK=${colMuszak}, NÉV=${colNev}, VSZ=${colVsz}`);

// 3. 01.09 oszlop keresése
const headerRow = percekData[headerRowIndex];
let jan09Col = -1;
for (let j = colVsz + 1; j < headerRow.length; j++) {
  const v = headerRow[j];
  if (String(v) === '2026.01.09') {
    jan09Col = j;
    break;
  }
}
console.log('01.09 oszlop:', jan09Col);

// 4. Operátorok feldolgozása (mint az import)
let foundInPercek = 0;
let notLac = 0;
let withPerc = 0;
const missing = [];
const found = [];

for (let i = headerRowIndex + 1; i < percekData.length; i++) {
  const row = percekData[i];
  if (!row) continue;

  const vsz = String(row[colVsz] || '').trim();
  
  // Csak LAC operátorok!
  const operator = lacOperators.get(vsz);
  if (!operator) {
    notLac++;
    continue;
  }
  
  foundInPercek++;
  
  const perc = Number(row[jan09Col] || 0);
  if (perc > 0) {
    withPerc++;
    found.push({ vsz, nev: operator.nev, muszak: operator.muszak, perc: Math.round(perc) });
  }
}

console.log('\n=== Eredmény ===');
console.log('Percek fülön nem LAC:', notLac);
console.log('LAC operátorok a Percek fülön:', foundInPercek);
console.log('01.09-én >0 perc:', withPerc);

// Kik hiányoznak?
console.log('\n=== Hiányzók (LAC de nincs a Percek fülön) ===');
const percekVszSet = new Set();
for (let i = headerRowIndex + 1; i < percekData.length; i++) {
  const row = percekData[i];
  if (!row) continue;
  const vsz = String(row[colVsz] || '').trim();
  percekVszSet.add(vsz);
}

let missingFromPercek = 0;
for (const [vsz, op] of lacOperators) {
  if (!percekVszSet.has(vsz)) {
    missingFromPercek++;
    console.log(`  ${vsz} - ${op.nev} (${op.muszak})`);
  }
}
console.log('Összesen hiányzik a Percek fülről:', missingFromPercek);
