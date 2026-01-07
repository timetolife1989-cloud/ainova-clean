// Quick test to check Excel file and sheets
const XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_PATH = '\\\\sveeafs01\\TDK_EEA_MAG_PEMC\\!Users\\Personal\\Gömböcz Gábor\\Gömböcz Gábor\\Napi perces\\napi perces 2026.xlsx';

console.log('Testing Excel file:', EXCEL_PATH);
console.log('');

try {
  // Check if file exists
  if (!fs.existsSync(EXCEL_PATH)) {
    console.log('ERROR: File not found!');
    process.exit(1);
  }
  console.log('✓ File exists');

  // Read file
  const buffer = fs.readFileSync(EXCEL_PATH);
  console.log('✓ File read, size:', buffer.length, 'bytes');

  // Parse Excel
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  console.log('✓ Excel parsed');
  console.log('');

  // List sheets
  console.log('Sheet names:');
  workbook.SheetNames.forEach((name, i) => {
    console.log(`  ${i + 1}. "${name}"`);
  });
  console.log('');

  // Current date info
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthNames = ['Jan', 'Feb', 'Márc', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szept', 'Okt', 'Nov', 'Dec'];
  
  console.log(`Current date: ${currentYear}.${String(currentMonth + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`);
  console.log(`Looking for sheets with: "${currentYear}" and "${monthNames[currentMonth]}"`);
  console.log('');

  // Find matching sheet
  const matchingSheets = workbook.SheetNames.filter(name => 
    name.includes(String(currentYear))
  );
  console.log('Sheets matching current year:', matchingSheets);

  // Check January sheet
  const janSheet = workbook.SheetNames.find(name => 
    name.includes(String(currentYear)) && name.toLowerCase().includes('jan')
  );
  
  if (janSheet) {
    console.log('');
    console.log(`Reading sheet: "${janSheet}"`);
    const sheet = workbook.Sheets[janSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Total rows: ${data.length}`);
    console.log('');
    console.log('First 10 rows (columns A, M, N, O, U, V, W):');
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] || [];
      const datum = row[0];  // A
      const cel = row[12];   // M
      const lehivSiemens = row[13];  // N
      const lehivNoSiemens = row[14]; // O
      const leadSiemens = row[20];  // U
      const leadNoSiemens = row[21]; // V
      const leadKaco = row[22];     // W
      
      console.log(`Row ${i}: Datum=${datum}, Cél=${cel}, LehívS=${lehivSiemens}, LehívNS=${lehivNoSiemens}, LeadS=${leadSiemens}, LeadNS=${leadNoSiemens}, LeadK=${leadKaco}`);
    }
  }

} catch (err) {
  console.error('ERROR:', err.message);
}
