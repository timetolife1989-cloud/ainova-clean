/**
 * PEMC Excel részletes elemzés - honnan jön a ~25k perc?
 */

const XLSX = require('xlsx');

const TELJ_PATH = 'O:\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

console.log('📊 PEMC EXCEL RÉSZLETES ELEMZÉS');
console.log('================================\n');

const wb = XLSX.readFile(TELJ_PATH);
console.log('Sheetek:', wb.SheetNames.join(', '));

// 1. "Percek" sheet - ez valószínűleg a Teljesítmény forrása
console.log('\n1️⃣ "Percek" SHEET (szerelők napi percei):\n');
const percekSheet = wb.Sheets['Percek'];
if (percekSheet) {
  const data = XLSX.utils.sheet_to_json(percekSheet, { header: 1 });
  console.log(`Összes sor: ${data.length}`);
  
  // Fejléc elemzés
  console.log('\nFejléc sorok:');
  data.slice(0, 5).forEach((row, i) => {
    console.log(`  ${i+1}: ${row.slice(0, 15).join(' | ')}`);
  });
  
  // Keressük a dátum oszlopokat
  console.log('\nDátum oszlopok keresése...');
  const headerRow = data[1] || data[0] || [];
  let dateColumns = [];
  headerRow.forEach((cell, i) => {
    if (cell && (cell.toString().includes('2025') || cell.toString().includes('2026') || typeof cell === 'number')) {
      dateColumns.push({ index: i, value: cell });
    }
  });
  console.log('Dátum oszlopok (első 10):', dateColumns.slice(0, 10).map(d => d.value));
  
  // Nézzük meg a 2025.12.15 vagy 2026.01.13 napi adatokat
  console.log('\nMinta adatok (sor 5-15):');
  data.slice(5, 15).forEach((row, i) => {
    const nev = row[1] || '';
    const napi = row[2] || '';
    const vsz = row[3] || '';
    console.log(`  ${nev.toString().padEnd(25)} | Napi: ${napi} | VSZ: ${vsz}`);
  });
}

// 2. "Napi perces kimutatás" sheet
console.log('\n2️⃣ "Napi perces kimutatás" SHEET:\n');
const napiSheet = wb.Sheets['Napi perces kimutatás'];
if (napiSheet) {
  const data = XLSX.utils.sheet_to_json(napiSheet, { header: 1 });
  console.log(`Összes sor: ${data.length}`);
  
  console.log('\nMinden sor:');
  data.forEach((row, i) => {
    console.log(`  ${i+1}: ${row.slice(0, 12).join(' | ')}`);
  });
}

// 3. PERC SAP szűrve LAC munkahely kódokra
console.log('\n3️⃣ PERC SAP - LAC MUNKAHELY KÓDOK (64L...):\n');
const sapSheet = wb.Sheets['PERC SAP'];
if (sapSheet) {
  const data = XLSX.utils.sheet_to_json(sapSheet, { header: 1 });
  
  let lacPerc = 0;
  let lacCount = 0;
  let filterPerc = 0;
  let filterCount = 0;
  let otherPerc = 0;
  let otherCount = 0;
  
  // 2026-01-13 adatok
  const targetDate = '2026-01-13';
  let targetDayLac = 0;
  let targetDayFilter = 0;
  let targetDayOther = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const munkahely = row[1]?.toString()?.trim() || '';
    const perc = parseFloat(row[10]) || 0;
    const datumCell = row[11];
    
    if (!perc) continue;
    
    // Dátum konverzió
    let datumStr = '';
    if (typeof datumCell === 'number') {
      const excelDate = new Date((datumCell - 25569) * 86400 * 1000);
      datumStr = excelDate.toISOString().split('T')[0];
    }
    
    // Munkahely szűrés
    if (munkahely.startsWith('64L')) {
      lacPerc += perc;
      lacCount++;
      if (datumStr === targetDate) targetDayLac += perc;
    } else if (munkahely.startsWith('64H') || munkahely === '6488' || munkahely === '6489' || munkahely === '6490') {
      filterPerc += perc;
      filterCount++;
      if (datumStr === targetDate) targetDayFilter += perc;
    } else {
      otherPerc += perc;
      otherCount++;
      if (datumStr === targetDate) targetDayOther += perc;
    }
  }
  
  console.log('Összesen:');
  console.log(`  LAC (64L...):     ${Math.round(lacPerc).toLocaleString()} perc (${lacCount} sor)`);
  console.log(`  Filter (64H...):  ${Math.round(filterPerc).toLocaleString()} perc (${filterCount} sor)`);
  console.log(`  Egyéb:            ${Math.round(otherPerc).toLocaleString()} perc (${otherCount} sor)`);
  console.log(`  ÖSSZES:           ${Math.round(lacPerc + filterPerc + otherPerc).toLocaleString()} perc`);
  
  console.log(`\n${targetDate} napra:`);
  console.log(`  LAC (64L...):     ${Math.round(targetDayLac).toLocaleString()} perc`);
  console.log(`  Filter (64H...):  ${Math.round(targetDayFilter).toLocaleString()} perc`);
  console.log(`  Egyéb:            ${Math.round(targetDayOther).toLocaleString()} perc`);
  console.log(`  ÖSSZES:           ${Math.round(targetDayLac + targetDayFilter + targetDayOther).toLocaleString()} perc`);
}

// 4. Keressük meg a ~25k perc forrását
console.log('\n4️⃣ 25K PERC FORRÁS KERESÉSE:\n');

// A "Percek" sheet-ből számoljuk ki az összesítést
if (percekSheet) {
  const data = XLSX.utils.sheet_to_json(percekSheet, { header: 1 });
  
  // Keressük a legutolsó dátum oszlopot és összegezzük
  // A 4. oszloptól kezdve vannak a dátumok
  
  // Összegezzük az utolsó napot minden szerelőre
  let dailyTotal = 0;
  let personCount = 0;
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    const nev = row[1];
    const napiPerces = parseFloat(row[2]) || 0; // "Napi perces" oszlop
    
    if (nev && napiPerces) {
      dailyTotal += napiPerces;
      personCount++;
    }
  }
  
  console.log(`"Percek" sheet - Napi perces összeg: ${dailyTotal.toLocaleString()} perc (${personCount} fő)`);
}

console.log('\n✅ Elemzés kész!');
