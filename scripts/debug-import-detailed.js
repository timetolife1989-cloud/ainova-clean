// Debug: miért hiányzik 18 operátor az SQL-ből
const XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_PATH = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

// Hiányzó operátorok (ezek nincsenek az SQL-ben)
const MISSING = [
  '30018450', '30014138', '30018411', '30015518', '30017536', 
  '30005903', '30014683', '30018417', '30018367', '30018406',
  '30018414', '30018427', '30018369', '30018418', '30018423',
  '30018390', '30018407', '30017099'
];

console.log('Reading Excel...');
const fileBuffer = fs.readFileSync(EXCEL_PATH);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

// 1. Filter létszám fül - LAC operátorok
const filterSheet = workbook.Sheets['Filter létszám'];
const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 });

const lacOperators = new Map();

// Header keresése
let filterHeaderRow = -1;
for (let i = 0; i < Math.min(5, filterData.length); i++) {
  const row = filterData[i];
  if (row && row.some(cell => String(cell).toUpperCase().includes('MŰSZAK'))) {
    filterHeaderRow = i;
    break;
  }
}

const startRow = filterHeaderRow >= 0 ? filterHeaderRow + 1 : 1;

for (let i = startRow; i < filterData.length; i++) {
  const row = filterData[i];
  if (!row) continue;

  const muszakRaw = String(row[0] || '').trim().toUpperCase();
  const vsz = String(row[1] || '').trim();
  const nev = String(row[4] || '').trim();
  const munkaterulet = String(row[11] || '').trim().toUpperCase();

  // Csak LAC (F1L) operátorok
  if (munkaterulet !== 'F1L') continue;
  // Csak A/L, B/L és C/L műszakok
  if (muszakRaw !== 'A/L' && muszakRaw !== 'B/L' && muszakRaw !== 'C/L') continue;
  if (!vsz || vsz.length < 5) continue;

  const muszak = muszakRaw.replace('/L', '');
  lacOperators.set(vsz, { muszak, vsz, nev, munkaterulet });
}

console.log(`\nFilter létszám - LAC operátorok: ${lacOperators.size}`);

// Ellenőrizzük a hiányzókat
console.log('\n=== HIÁNYZÓK A FILTER LÉTSZÁM-BAN? ===');
for (const vsz of MISSING) {
  const op = lacOperators.get(vsz);
  if (op) {
    console.log(`✓ ${vsz} - ${op.nev} (${op.muszak}) - BENNE VAN`);
  } else {
    console.log(`✗ ${vsz} - NINCS a Filter létszám fülön!`);
  }
}

// 2. Percek fül - ellenőrizzük ugyanezeket
const percekSheet = workbook.Sheets['Percek'];
const percekData = XLSX.utils.sheet_to_json(percekSheet, { header: 1 });

// Header keresése
let headerRowIndex = -1;
let colVsz = -1;

for (let i = 0; i < Math.min(10, percekData.length); i++) {
  const row = percekData[i];
  if (!row) continue;
  for (let j = 0; j < Math.min(20, row.length); j++) {
    const cell = String(row[j] || '').toUpperCase().trim();
    if (cell === 'VSZ') colVsz = j;
  }
  if (colVsz >= 0) {
    headerRowIndex = i;
    break;
  }
}

console.log(`\nPercek fül - header row: ${headerRowIndex}, VSZ col: ${colVsz}`);

// Keressük meg a hiányzókat a Percek fülön
const percekVszMap = new Map();
for (let i = headerRowIndex + 1; i < percekData.length; i++) {
  const row = percekData[i];
  if (!row) continue;
  const vsz = String(row[colVsz] || '').trim();
  if (vsz) {
    percekVszMap.set(vsz, { row: i, data: row });
  }
}

console.log('\n=== HIÁNYZÓK A PERCEK FÜLÖN? ===');
for (const vsz of MISSING) {
  const p = percekVszMap.get(vsz);
  if (p) {
    console.log(`✓ ${vsz} - Percek fül row ${p.row}`);
  } else {
    console.log(`✗ ${vsz} - NINCS a Percek fülön!`);
  }
}

// 3. Most szimuláljuk az import logikát pont ahogy az API teszi
console.log('\n=== SZIMULÁLT IMPORT ===');
let notLac = 0;

for (let i = headerRowIndex + 1; i < percekData.length; i++) {
  const row = percekData[i];
  if (!row) continue;

  const vsz = String(row[colVsz] || '').trim();
  
  // Csak LAC operátorok!
  const operator = lacOperators.get(vsz);
  if (!operator) {
    notLac++;
    if (MISSING.includes(vsz)) {
      console.log(`✗ ${vsz} - NEM TALÁL az lacOperators map-ben! (Percek row ${i})`);
      // De az előbb még benne volt?!
      console.log(`  → lacOperators.has('${vsz}'): ${lacOperators.has(vsz)}`);
    }
    continue;
  }
}

console.log(`\nNot-LAC skipped: ${notLac}`);
console.log(`LAC operators map size: ${lacOperators.size}`);

// Extra debug: VSZ típusok
console.log('\n=== VSZ TÍPUS ELLENŐRZÉS ===');
const testVsz = '30014683'; // Virágh Roland
console.log(`Filter létszám has "${testVsz}": ${lacOperators.has(testVsz)}`);
console.log(`Percek fül has "${testVsz}": ${percekVszMap.has(testVsz)}`);

// Nézzük meg mi a tényleges érték a Filter létszám-ban
console.log('\n=== Filter létszám - Virágh Roland keresése ===');
for (let i = startRow; i < filterData.length; i++) {
  const row = filterData[i];
  if (!row) continue;
  const vsz = String(row[1] || '').trim();
  const nev = String(row[4] || '').trim();
  if (vsz === '30014683' || nev.includes('Virágh')) {
    console.log(`Row ${i}: VSZ="${row[1]}" (type: ${typeof row[1]}), NÉV="${nev}", MŰSZAK="${row[0]}", MUNKAT="${row[11]}"`);
  }
}
