/**
 * Debug - Mi van Row 14-50 között
 */

const XLSX = require('xlsx');

const EXCEL_PATH = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['CW03 ütemterv'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== ROW 14-50 TARTALOM (N oszlop = index 13) ===');
for (let i = 14; i < 50; i++) {
  const row = data[i];
  if (!row) {
    console.log(`Row ${i}: <null>`);
    continue;
  }
  
  const col13 = String(row[13] || '').trim();
  const col19 = row[19];
  console.log(`Row ${i}: col13="${col13}", col19=${col19}`);
}
