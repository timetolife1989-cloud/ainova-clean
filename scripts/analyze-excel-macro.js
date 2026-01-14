/**
 * Excel VBA makró kód kiolvasása
 */

const XLSX = require('xlsx');

// War Room Excel
const WARROOM_PATH = 'O:\\!Production\\LAC\\!War Room Tracker\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

// Teljesítmény Excel
const TELJ_PATH = 'O:\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

console.log('📖 Excel Makró Elemzés');
console.log('======================\n');

// 1. War Room Excel sheetek
console.log('1️⃣ WAR ROOM EXCEL SHEETEK:\n');
try {
  const wb1 = XLSX.readFile(WARROOM_PATH);
  console.log('Sheetek:', wb1.SheetNames.join(', '));
  
  // Keressük a Teljesítmény sheet-et
  if (wb1.Sheets['Teljesítmény']) {
    const data = XLSX.utils.sheet_to_json(wb1.Sheets['Teljesítmény'], { header: 1 });
    console.log('\nTeljesítmény sheet első 5 sor:');
    data.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i+1}: ${row.slice(0, 10).join(' | ')}`);
    });
  }
  
  // Összegyűjtés sheet
  if (wb1.Sheets['Összegyűjtés']) {
    const data = XLSX.utils.sheet_to_json(wb1.Sheets['Összegyűjtés'], { header: 1 });
    console.log('\nÖsszegyűjtés sheet első 10 sor:');
    data.slice(0, 10).forEach((row, i) => {
      console.log(`  ${i+1}: ${row.slice(0, 8).join(' | ')}`);
    });
  }
  
} catch (err) {
  console.log('Hiba:', err.message);
}

// 2. PEMC Excel - Telj% sheet keresése
console.log('\n2️⃣ PEMC EXCEL SHEETEK:\n');
try {
  const wb2 = XLSX.readFile(TELJ_PATH);
  console.log('Sheetek:', wb2.SheetNames.join(', '));
  
  // Keressük a releváns sheeteket
  wb2.SheetNames.forEach(sheetName => {
    if (sheetName.toLowerCase().includes('telj') || 
        sheetName.toLowerCase().includes('perc') ||
        sheetName.toLowerCase().includes('lac')) {
      const sheet = wb2.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\n${sheetName} (${data.length} sor):`);
      if (data.length > 0) {
        console.log('  Fejléc:', data[0]?.slice(0, 10).join(' | '));
        if (data.length > 1) {
          console.log('  1. sor:', data[1]?.slice(0, 10).join(' | '));
        }
      }
    }
  });
  
} catch (err) {
  console.log('Hiba:', err.message);
}

// 3. Nézük meg a FIX ütemterv sheetet - honnan jön a leadott?
console.log('\n3️⃣ CW03 ÜTEMTERV SHEET ELEMZÉSE:\n');
try {
  const wb1 = XLSX.readFile(WARROOM_PATH);
  
  // CW03 ütemterv
  const cwSheet = wb1.Sheets['CW03 ütemterv'];
  if (cwSheet) {
    const data = XLSX.utils.sheet_to_json(cwSheet, { header: 1 });
    console.log('CW03 ütemterv sorok:', data.length);
    
    // Keressük a "leadott" oszlopokat
    const header = data[0] || [];
    header.forEach((h, i) => {
      if (h && h.toString().toLowerCase().includes('lead')) {
        console.log(`  Oszlop ${i} (${String.fromCharCode(65 + i)}): ${h}`);
      }
    });
    
    // Első pár sor
    console.log('\nElső 5 sor:');
    data.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i+1}: ${row.slice(0, 15).join(' | ')}`);
    });
  }
  
} catch (err) {
  console.log('Hiba:', err.message);
}

console.log('\n✅ Elemzés kész!');
