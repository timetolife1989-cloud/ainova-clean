/**
 * PERC SAP → Kategória mapping és napi összesítés
 * 
 * Cél: A PERC SAP fülből kategóriánként összesíteni a leadott perceket naponta
 */

const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'O:\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

console.log('=== PERC SAP → Kategória összesítés ===\n');

// Művelet → Kategória mapping (a K.Z norma és összevont folyamatok alapján)
const MUVELET_KATEGORIA = {
  // MÉRÉS
  'Előmérés': 'MERES',
  'Végmérés': 'MERES',
  
  // ELŐKÉSZÍTÉS
  'Anyagbeérkeztetés': 'ELOKESZITES',
  'Anyaglehívás': 'ELOKESZITES',
  'Vasmag előkészítés': 'ELOKESZITES',
  'Darabolás': 'ELOKESZITES',
  'Komissiózás': 'ELOKESZITES',
  
  // SZERELÉS
  'Tekercs szerelés': 'SZERELES',
  
  // VÉGSZERELÉS
  'Végszerelés': 'VEGSZERELES',
  'Festés': 'VEGSZERELES',
  'Hőkezelés': 'VEGSZERELES',
  'Zsír eltávolítás': 'VEGSZERELES',
  'Zsírzás': 'VEGSZERELES',
  
  // IMPREGNÁLÁS
  'Impregnálás': 'IMPREGNALAS',
  
  // TEKERCSELÉS
  'Gépi tekercselés': 'TEKERCSELÉS',
  
  // CSOMAGOLÁS
  'Csomagolás, címkézés': 'CSOMAGOLAS',
  'Szállítás': 'CSOMAGOLAS',
  'Kapu visszajelentés': 'CSOMAGOLAS',
  
  // MARÁS/ÓNOZÁS
  'Huzalmarás': 'MARAS_ONOZAS',
  'Ónozás': 'MARAS_ONOZAS',
  
  // MINŐSÉGELLENŐRZÉS → Előkészítéshez
  'Minőségellenőrzés 1': 'ELOKESZITES',
  'Minőségellenőrzés 2': 'ELOKESZITES',
};

// Excel serial date → JS Date
function excelDateToJS(serial) {
  if (!serial || serial < 1) return null;
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

// Dátum formázás
function formatDate(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const buf = fs.readFileSync(excelPath);
const wb = XLSX.read(buf, { type: 'buffer' });

const sapSheet = wb.Sheets['PERC SAP'];
const data = XLSX.utils.sheet_to_json(sapSheet, { header: 1 });

console.log('Összes sor:', data.length);

// Napi + kategória összesítés
const napiKategoria = new Map(); // "2025-12-16|SZERELES" → perc összeg
const ismeretlenMuveletek = new Set();
let osszPerc = 0;
let feldolgozott = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  
  const munkahely = String(row[1] || '');
  const muvelet = String(row[5] || '').trim();
  const perc = Number(row[10] || 0);
  const datumSerial = row[11];
  
  // Csak LAC munkahely (64L...)
  if (!munkahely.startsWith('64L') && munkahely !== '6404') continue;
  
  // Csak pozitív perc
  if (perc <= 0) continue;
  
  // Dátum konverzió
  const datum = excelDateToJS(datumSerial);
  if (!datum) continue;
  
  const datumStr = formatDate(datum);
  
  // Kategória keresése
  const kategoria = MUVELET_KATEGORIA[muvelet];
  if (!kategoria) {
    ismeretlenMuveletek.add(muvelet);
    continue;
  }
  
  // Összesítés
  const key = `${datumStr}|${kategoria}`;
  napiKategoria.set(key, (napiKategoria.get(key) || 0) + perc);
  osszPerc += perc;
  feldolgozott++;
}

console.log('Feldolgozott sorok:', feldolgozott);
console.log('Összesen leadott perc:', Math.round(osszPerc));

if (ismeretlenMuveletek.size > 0) {
  console.log('\n⚠️  Ismeretlen műveletek (nincs kategória):');
  [...ismeretlenMuveletek].forEach(m => console.log('  - ' + m));
}

// Napok listázása
console.log('\n=== Napi összesítés (utolsó 10 nap) ===');
const napok = new Map();

napiKategoria.forEach((perc, key) => {
  const [datum, kat] = key.split('|');
  if (!napok.has(datum)) napok.set(datum, {});
  napok.get(datum)[kat] = Math.round(perc);
});

// Rendezés és utolsó 10 nap
const sortedNapok = [...napok.keys()].sort().slice(-10);

sortedNapok.forEach(datum => {
  const katData = napok.get(datum);
  const osszNapi = Object.values(katData).reduce((s, v) => s + v, 0);
  console.log(`\n${datum} (össz: ${osszNapi} perc):`);
  Object.entries(katData)
    .sort((a, b) => b[1] - a[1])
    .forEach(([kat, p]) => {
      const arany = ((p / osszNapi) * 100).toFixed(1);
      console.log(`  ${kat.padEnd(15)} ${String(p).padStart(6)} perc (${arany}%)`);
    });
});

// Heti összesítés
console.log('\n=== Kategória összesítés (teljes) ===');
const kategoriaOssz = {};
napiKategoria.forEach((perc, key) => {
  const kat = key.split('|')[1];
  kategoriaOssz[kat] = (kategoriaOssz[kat] || 0) + perc;
});

Object.entries(kategoriaOssz)
  .sort((a, b) => b[1] - a[1])
  .forEach(([kat, p]) => {
    const arany = ((p / osszPerc) * 100).toFixed(1);
    console.log(`  ${kat.padEnd(15)} ${String(Math.round(p)).padStart(8)} perc (${arany}%)`);
  });
