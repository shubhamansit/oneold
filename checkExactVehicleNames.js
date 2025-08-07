const XLSX = require('xlsx');

try {
  console.log('=== CHECKING EXACT VEHICLE NAMES ===');
  
  const excelFiles = [
    'JAN - 2025.xlsx',
    'FEB -2025.xlsx', 
    'MARCH -2025.xlsx',
    '05 MAY 2025 NEW DB.xlsx',
    '06 JUN 2025 NEW DB.xlsx'
  ];
  
  excelFiles.forEach((fileName) => {
    if (require('fs').existsSync(fileName)) {
      console.log(`\n--- ${fileName} ---`);
      
      const workbook = XLSX.readFile(fileName);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find vehicles with 0309
      data.forEach((row, index) => {
        if (row[2] && row[2].toString().includes('0309')) {
          console.log(`Row ${index}: "${row[2]}"`);
        }
      });
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
} 