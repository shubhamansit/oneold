const XLSX = require('xlsx');

try {
  console.log('=== CHECKING EXCEL DATA FOR GJ06BX0309 ===');
  
  const excelFiles = [
    'JAN - 2025.xlsx',
    'FEB -2025.xlsx', 
    'MARCH -2025.xlsx',
    '04  APRIL 2025   NEW DB.xlsx',
    '05 MAY 2025 NEW DB.xlsx',
    '06 JUN 2025 NEW DB.xlsx'
  ];
  
  excelFiles.forEach((fileName, monthIndex) => {
    if (require('fs').existsSync(fileName)) {
      console.log(`\n--- ${fileName} ---`);
      
      const workbook = XLSX.readFile(fileName);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find GJ06BX0309 in the data
      let vehicleRow = null;
      let vehicleCol = null;
      
      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < data[row].length; col++) {
          const cellValue = data[row][col];
          if (cellValue && cellValue.toString().includes('GJ06BX0309')) {
            vehicleRow = row;
            vehicleCol = col;
            break;
          }
        }
        if (vehicleRow !== null) break;
      }
      
      if (vehicleRow !== null) {
        console.log(`Found GJ06BX0309 at row ${vehicleRow}, col ${vehicleCol}`);
        console.log(`Vehicle ID: ${data[vehicleRow][vehicleCol]}`);
        
        // Get the daily data (starting from column 4)
        const dailyData = data[vehicleRow].slice(3);
        console.log(`Daily data length: ${dailyData.length}`);
        
        // Show first 10 days
        console.log('First 10 days:');
        dailyData.slice(0, 10).forEach((value, index) => {
          console.log(`  Day ${index + 1}: ${value}`);
        });
        
        // Count non-zero values
        const nonZeroDays = dailyData.filter(value => value && value > 0);
        console.log(`Days with missed checkpoints: ${nonZeroDays.length}`);
        
        if (nonZeroDays.length > 0) {
          console.log('Sample missed checkpoint days:');
          nonZeroDays.slice(0, 10).forEach(value => {
            console.log(`  ${value}`);
          });
        }
        
      } else {
        console.log('GJ06BX0309 not found in this file');
      }
    } else {
      console.log(`\n--- ${fileName} not found ---`);
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
} 