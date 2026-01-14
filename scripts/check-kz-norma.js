const XLSX = require('xlsx');

const wb = XLSX.readFile('C:\\Users\\EE0853\\OneDrive - tdkgroup\\Asztal\\LaC erőforrás kalkulátor,allokáció.2026.xlsm');
const sheet = wb.Sheets['K.Z norma'];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
const header = data[0];

console.log('=== K.Z NORMA OSZLOPOK (SAP FOLYAMATOK) ===');
console.log('Oszlopszám:', header.length);
header.forEach((col, i) => { 
  if(col) console.log(i + ': ' + col); 
});
