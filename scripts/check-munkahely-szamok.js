const XLSX = require('xlsx');
const wb = XLSX.readFile('C:\\Users\\EE0853\\OneDrive - tdkgroup\\Asztal\\LaC erőforrás kalkulátor,allokáció.2026.xlsm');
const sheet = wb.Sheets['Munkahely számok'];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1});

console.log('=== MUNKAHELY SZÁMOK TELJES HEADER ===');
console.log(JSON.stringify(data[0]));

console.log('\n=== MINTA SOROK (első 5) ===');
data.slice(1, 6).forEach((row, i) => {
  console.log((i+1) + ': ' + JSON.stringify(row));
});
