/**
 * Debug script - Excel struktúra vizsgálata
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const EXCEL_PATH = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

console.log('='.repeat(60));
console.log('EXCEL STRUKTÚRA DEBUG');
console.log('='.repeat(60));

const buf = fs.readFileSync(EXCEL_PATH);
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('\n📋 ÖSSZES SHEET:');
wb.SheetNames.forEach((name, i) => console.log(`  ${i+1}. ${name}`));

// CW03 ütemterv sheet részletes vizsgálata
const targetSheet = wb.SheetNames.find(n => n.includes('CW03'));
if (!targetSheet) {
  console.log('\n❌ CW03 sheet nem található!');
  process.exit(1);
}

console.log(`\n📄 TARGET SHEET: "${targetSheet}"`);

const sheet = wb.Sheets[targetSheet];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log(`\n📊 Sorok száma: ${data.length}`);

// Első 40 sor vizsgálata
console.log('\n🔍 ELSŐ 40 SOR VIZSGÁLATA:');
for (let i = 0; i < Math.min(40, data.length); i++) {
  const row = data[i];
  if (!row || row.length === 0) {
    console.log(`  Row ${i}: [ÜRES]`);
    continue;
  }
  
  // Első 15 cella
  const cells = row.slice(0, 15).map((c, j) => {
    if (c === undefined || c === null) return '_';
    if (typeof c === 'number' && c > 40000 && c < 50000) {
      // Excel dátum
      const d = new Date((c - 25569) * 86400 * 1000);
      return `[DATE:${d.toISOString().split('T')[0]}]`;
    }
    return String(c).substring(0, 15);
  });
  
  console.log(`  Row ${i}: ${cells.join(' | ')}`);
}

// "Napi fix ütemterv" keresése
console.log('\n🔎 "Napi fix ütemterv" KERESÉSE:');
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  for (let j = 0; j < row.length; j++) {
    const cell = String(row[j] || '').toLowerCase();
    if (cell.includes('napi') && cell.includes('fix')) {
      console.log(`  ✅ Találat: Row ${i}, Col ${j} = "${row[j]}"`);
    }
  }
}

// "Típus" oszlop keresése
console.log('\n🔎 "Típus" OSZLOP KERESÉSE:');
for (let i = 0; i < Math.min(30, data.length); i++) {
  const row = data[i];
  if (!row) continue;
  
  for (let j = 0; j < row.length; j++) {
    const cell = String(row[j] || '').toLowerCase().trim();
    if (cell === 'típus' || cell === 'tipus') {
      console.log(`  ✅ Találat: Row ${i}, Col ${j} = "${row[j]}"`);
      
      // Következő sor (első adat sor)
      const nextRow = data[i + 1];
      if (nextRow) {
        console.log(`     Következő sor: ${nextRow.slice(0, 12).join(' | ')}`);
      }
      
      // Header sor (dátumok)
      console.log(`     Header sor: ${row.slice(j, j+12).join(' | ')}`);
    }
  }
}

// B8 kezdetű sorok keresése (termékek)
console.log('\n🔎 "B86" KEZDETŰ TERMÉKEK:');
let termekCount = 0;
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  for (let j = 0; j < Math.min(5, row.length); j++) {
    const cell = String(row[j] || '');
    if (cell.startsWith('B86')) {
      console.log(`  Row ${i}, Col ${j}: ${cell} -> [${row.slice(j, j+12).join(', ')}]`);
      termekCount++;
      if (termekCount >= 25) break;
    }
  }
  if (termekCount >= 25) break;
}

console.log('\n' + '='.repeat(60));
