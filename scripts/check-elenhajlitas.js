const XLSX = require('xlsx');
const wb = XLSX.readFile('C:\\Users\\EE0853\\OneDrive - tdkgroup\\Asztal\\LaC erőforrás kalkulátor,allokáció.2026.xlsm');
const sheet = wb.Sheets['Munkahely számok'];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1});

const muveletek = new Set();
data.forEach(r => { if(r[8]) muveletek.add(r[8]); });

const all = [...muveletek].sort();
console.log('=== OSSZES EGYEDI MUVELET (' + all.length + ' db) ===');
all.forEach(m => console.log(m));

console.log('\n=== ÉLÉNHAJLÍTÁS KERESÉS ===');
const match = all.filter(m => m.toLowerCase().includes('hajl') || m.toLowerCase().includes('élen') || m.toLowerCase().includes('élén'));
if (match.length) {
  match.forEach(m => console.log('TALÁLAT: ' + m));
} else {
  console.log('Nem található "élénhajlítás" vagy hasonló művelet');
}
