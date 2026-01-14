const XLSX = require('xlsx');
const wb = XLSX.readFile('C:\\Users\\EE0853\\OneDrive - tdkgroup\\Asztal\\LaC erőforrás kalkulátor,allokáció.2026.xlsm');

// 1. Összevont folyamatok beolvasása (SAP név -> kategória)
const osszevontSheet = wb.Sheets['Összevont folymatok'];
const osszevontData = XLSX.utils.sheet_to_json(osszevontSheet, {header: 1}).slice(1);

const sapToKategoria = new Map();
osszevontData.forEach(row => {
  if (row[0] && row[1]) {
    sapToKategoria.set(row[0], row[1].toLowerCase());
  }
});

// 2. Munkahely számok beolvasása (SAP név -> munkahely kód)
const munkahelySheet = wb.Sheets['Munkahely számok'];
const munkahelyData = XLSX.utils.sheet_to_json(munkahelySheet, {header: 1}).slice(1);

const sapToMunkahely = new Map();
munkahelyData.forEach(row => {
  if (row[8] && row[6]) {
    if (!sapToMunkahely.has(row[8])) {
      sapToMunkahely.set(row[8], new Set());
    }
    sapToMunkahely.get(row[8]).add(row[6]);
  }
});

// 3. MÓDOSÍTOTT kategória mapping (a te kérésed szerint)
function getModositottKategoria(eredetiKat, sapNev) {
  // Maszkolás, merítés → szerelés (ELŐBB ellenőrizzük!)
  if (sapNev && (sapNev.toLowerCase().includes('maszkolás') || sapNev.toLowerCase().includes('merítés'))) {
    return 'szerelés';
  }
  
  // Festés → végszerelés (ami marad - csak a "Festés" művelet)
  if (eredetiKat === 'festés') return 'végszerelés';
  
  return eredetiKat;
}

// 4. Kategóriák összesítése
const kategoriak = new Map();

sapToKategoria.forEach((eredetiKat, sapNev) => {
  const modKat = getModositottKategoria(eredetiKat, sapNev);
  const munkahely = sapToMunkahely.get(sapNev);
  const munkahelyek = munkahely ? [...munkahely].join(', ') : 'N/A';
  
  if (!kategoriak.has(modKat)) {
    kategoriak.set(modKat, []);
  }
  kategoriak.get(modKat).push({ sapNev, munkahelyek, eredetiKat });
});

// 5. Eredmény kiírása
console.log('================================================================================');
console.log('  AINOVA - FOLYAMAT KATEGÓRIÁK ÉS SAP LÉPÉSEK (MÓDOSÍTOTT)');
console.log('================================================================================');
console.log('');
console.log('MÓDOSÍTÁSOK:');
console.log('  - Festés → végszerelés');
console.log('  - Maszkolás, merítés → szerelés');
console.log('  - Filter marad külön');
console.log('  - AWI hegesztés marad külön');
console.log('');
console.log('================================================================================');

const sorrendezett = [...kategoriak.keys()].sort();

sorrendezett.forEach(kat => {
  const items = kategoriak.get(kat);
  console.log('');
  console.log(`📁 ${kat.toUpperCase()} (${items.length} SAP lépés)`);
  console.log('-'.repeat(60));
  items.forEach(item => {
    const orig = item.eredetiKat !== kat ? ` [eredeti: ${item.eredetiKat}]` : '';
    console.log(`  • ${item.sapNev}`);
    console.log(`    Munkahely: ${item.munkahelyek}${orig}`);
  });
});

// 6. Összesítés
console.log('');
console.log('================================================================================');
console.log('ÖSSZESÍTÉS:');
console.log('================================================================================');
sorrendezett.forEach(kat => {
  console.log(`  ${kat.toUpperCase().padEnd(20)} : ${kategoriak.get(kat).length} lépés`);
});
console.log('  ' + '-'.repeat(30));
console.log(`  ÖSSZES                     : ${[...kategoriak.values()].flat().length} lépés`);
