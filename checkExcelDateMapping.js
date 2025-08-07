const XLSX = require('xlsx');

try {
  console.log('=== CHECKING EXCEL DATE MAPPING ===');
  
  // Check January file to understand the date structure
  const fileName = 'JAN - 2025.xlsx';
  
  if (require('fs').existsSync(fileName)) {
    console.log(`\n--- ${fileName} ---`);
    
    const workbook = XLSX.readFile(fileName);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the vehicle row
    let vehicleRow = null;
    for (let row = 0; row < data.length; row++) {
      if (data[row][2] && data[row][2].toString() === 'GJ 06 BX 0309 E-1') {
        vehicleRow = row;
        break;
      }
    }
    
    if (vehicleRow !== null) {
      console.log(`Found vehicle at row ${vehicleRow}: "${data[vehicleRow][2]}"`);
      
      // Check the header row to understand column structure
      console.log('\nChecking header structure:');
      const headerRow = data[0]; // Assuming first row is header
      console.log('First 10 columns:');
      for (let i = 0; i < 10; i++) {
        console.log(`  Column ${i}: "${headerRow[i]}"`);
      }
      
      // Check if there are date headers in the first few rows
      console.log('\nChecking first 5 rows for date information:');
      for (let row = 0; row < 5; row++) {
        console.log(`Row ${row}:`);
        for (let col = 0; col < 5; col++) {
          console.log(`  Col ${col}: "${data[row][col]}"`);
        }
      }
      
      // Get the daily data for the vehicle
      const dailyData = data[vehicleRow].slice(3); // Starting from column 4 (index 3)
      console.log(`\nDaily data length: ${dailyData.length}`);
      
      // Show days with missed checkpoints and their column numbers
      console.log('\nDays with missed checkpoints:');
      dailyData.forEach((value, index) => {
        if (value && value > 0) {
          const columnNumber = index + 1; // Excel column number (1-based)
          console.log(`  Column ${columnNumber}: ${value} missed checkpoints`);
        }
      });
      
      // Check if there's a date row or if we need to calculate dates differently
      console.log('\nChecking for date information in the sheet:');
      for (let row = 0; row < 10; row++) {
        const rowData = data[row];
        for (let col = 0; col < 5; col++) {
          const cellValue = rowData[col];
          if (cellValue && cellValue.toString().includes('2025')) {
            console.log(`  Row ${row}, Col ${col}: "${cellValue}"`);
          }
        }
      }
      
    } else {
      console.log('Vehicle not found');
    }
  } else {
    console.log(`File ${fileName} not found`);
  }
  
} catch (error) {
  console.error('Error:', error.message);
} 