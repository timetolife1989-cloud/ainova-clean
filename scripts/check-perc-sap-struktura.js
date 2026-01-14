/**
 * PERC SAP fül struktúra elemzése
 * Cél: Megérteni hogyan lehet kategóriánként összesíteni a leadott perceket
 */

const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'O:\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

console.log('=== PEMC Excel - PERC SAP fül elemzése ===\n');

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

// Munkalapok listázása
console.log('Munkalapok:');
wb.SheetNames.forEach(name => console.log('  - ' + name));

// PERC SAP fül
const sapSheet = wb.Sheets['PERC SAP'];
if (!sapSheet) {
  console.log('PERC SAP fül nem található!');
  process.exit(1);
}

const data = XLSX.utils.sheet_to_json(sapSheet, { header: 1 });
console.log('\nÖsszes sor:', data.length);

// Header sor (1. sor)
console.log('\n=== Header (1. sor) ===');
const header = data[0];
header.forEach((h, i) => {
  if (h) console.log(`  ${String.fromCharCode(65 + i)} (${i}): ${h}`);
});

// Első 5 adat sor
console.log('\n=== Első 5 adat sor ===');
for (let i = 1; i <= 5 && i < data.length; i++) {
  const row = data[i];
  console.log(`\nRow ${i + 1}:`);
  console.log(`  B (Munkahely): ${row[1]}`);
  console.log(`  D (Anyag): ${row[3]}`);
  console.log(`  F (Művelet): ${row[5]}`);
  console.log(`  K (Visszajel.): ${row[10]}`);
  console.log(`  L (Dátum?): ${row[11]}`);
  console.log(`  M (Dátum2?): ${row[12]}`);
}

// Dátum oszlopok keresése
console.log('\n=== Dátum formátumok keresése ===');
const row2 = data[1];
for (let i = 10; i < Math.min(20, row2.length); i++) {
  const v = row2[i];
  console.log(`  ${String.fromCharCode(65 + i)} (${i}): ${v} (${typeof v})`);
}

// Egyedi munkahely kódok
console.log('\n=== Egyedi munkahely kódok (B oszlop) ===');
const munkahely = new Set();
for (let i = 1; i < Math.min(500, data.length); i++) {
  const row = data[i];
  if (row && row[1]) munkahely.add(String(row[1]));
}
console.log('Egyedi munkahely kódok száma:', munkahely.size);
console.log('Minták:', [...munkahely].slice(0, 20).join(', '));

// Egyedi műveletek
console.log('\n=== Egyedi műveletek (F oszlop) ===');
const muveletek = new Set();
for (let i = 1; i < Math.min(500, data.length); i++) {
  const row = data[i];
  if (row && row[5]) muveletek.add(String(row[5]));
}
console.log('Egyedi műveletek száma:', muveletek.size);
[...muveletek].slice(0, 30).forEach(m => console.log('  - ' + m));
