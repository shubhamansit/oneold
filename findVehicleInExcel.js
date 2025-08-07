const XLSX = require('xlsx');

try {
  console.log('=== FINDING VEHICLES WITH 0309 IN EXCEL ===');
  
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
      const vehiclesWith0309 = [];
      
      data.forEach((row, index) => {
        if (row[2] && row[2].toString().includes('0309')) {
          vehiclesWith0309.push({
            row: index,
            vehicle: row[2]
          });
        }
      });
      
      if (vehiclesWith0309.length > 0) {
        console.log('Found vehicles with 0309:');
        vehiclesWith0309.forEach(item => {
          console.log(`  Row ${item.row}: ${item.vehicle}`);
        });
      } else {
        console.log('No vehicles with 0309 found');
      }
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
} 