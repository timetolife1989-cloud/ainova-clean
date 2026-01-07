// Excel struktúra elemző script
// Futtatás: node scripts/analyze-excel.js

const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'PEMC-debug.xlsm');

console.log('Reading:', EXCEL_PATH);

const workbook = XLSX.readFile(EXCEL_PATH);

console.log('\n=== SHEET NAMES ===');
console.log(workbook.SheetNames);

// Filter létszám elemzése
console.log('\n=== FILTER LÉTSZÁM ===');
const filterSheet = workbook.Sheets['Filter létszám'];
if (filterSheet) {
  const filterData = XLSX.utils.sheet_to_json(filterSheet, { header: 1 });
  
  console.log('First 3 rows:');
  for (let i = 0; i < Math.min(3, filterData.length); i++) {
    console.log(`Row ${i}:`, filterData[i]?.slice(0, 15));
  }
  
  // LAC operátorok keresése
  let lacCount = 0;
  for (let i = 1; i < filterData.length; i++) {
    const row = filterData[i];
    if (!row) continue;
    const muszak = String(row[0] || '').trim().toUpperCase();
    const munkaterulet = String(row[11] || '').trim().toUpperCase();
    if ((muszak === 'A/L' || muszak === 'B/L' || muszak === 'C/L') && munkaterulet === 'F1L') {
      lacCount++;
      if (lacCount <= 3) {
        console.log(`LAC example: muszak=${muszak}, vsz=${row[1]}, nev=${row[4]}, munkat=${munkaterulet}`);
      }
    }
  }
  console.log(`Total LAC operators: ${lacCount}`);
}

// Percek elemzése
console.log('\n=== PERCEK ===');
const percekSheet = workbook.Sheets['Percek'];
if (percekSheet) {
  const percekData = XLSX.utils.sheet_to_json(percekSheet, { header: 1 });
  
  console.log('First 5 rows:');
  for (let i = 0; i < Math.min(5, percekData.length); i++) {
    console.log(`Row ${i}:`, percekData[i]?.slice(0, 10));
  }
  
  // Header keresés
  let headerRow = -1;
  for (let i = 0; i < 5; i++) {
    const row = percekData[i];
    if (!row) continue;
    for (let j = 0; j < 10; j++) {
      if (String(row[j] || '').toUpperCase() === 'VSZ') {
        headerRow = i;
        console.log(`\nHeader found at row ${i}, VSZ at column ${j}`);
        break;
      }
    }
    if (headerRow >= 0) break;
  }
  
  if (headerRow >= 0) {
    const header = percekData[headerRow];
    console.log('\nHeader columns:');
    for (let j = 0; j < Math.min(20, header?.length || 0); j++) {
      const val = header[j];
      let display = val;
      if (typeof val === 'number' && val > 40000 && val < 50000) {
        // Excel date serial
        const date = new Date((val - 25569) * 86400 * 1000);
        display = `${val} → ${date.toISOString().split('T')[0]}`;
      }
      console.log(`  Col ${j}: ${display}`);
    }
    
    // Dátum oszlopok keresése
    console.log('\nDate columns (serial → date):');
    let dateCount = 0;
    for (let j = 0; j < (header?.length || 0); j++) {
      const val = header[j];
      if (typeof val === 'number' && val > 40000 && val < 50000) {
        const date = new Date((val - 25569) * 86400 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        console.log(`  Col ${j}: ${val} → ${dateStr}`);
        dateCount++;
        if (dateCount >= 10) {
          console.log('  ... (first 10 shown)');
          break;
        }
      }
    }
  }
}

// PERC SAP elemzése
console.log('\n=== PERC SAP ===');
const sapSheet = workbook.Sheets['PERC SAP'];
if (sapSheet) {
  const sapData = XLSX.utils.sheet_to_json(sapSheet, { header: 1 });
  
  console.log('First 5 rows:');
  for (let i = 0; i < Math.min(5, sapData.length); i++) {
    console.log(`Row ${i}:`, sapData[i]?.slice(0, 15));
  }
  
  console.log(`\nTotal rows: ${sapData.length}`);
}

console.log('\n=== DONE ===');
