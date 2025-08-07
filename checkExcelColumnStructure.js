const XLSX = require('xlsx');

try {
  console.log('=== CHECKING EXCEL COLUMN STRUCTURE ===');
  
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
      console.log('\nHeader row structure:');
      const headerRow = data[1]; // Row 1 seems to have the day numbers
      console.log('First 35 columns:');
      for (let i = 0; i < 35; i++) {
        console.log(`  Column ${i}: "${headerRow[i]}"`);
      }
      
      // Check the vehicle row data
      console.log('\nVehicle row data (first 35 columns):');
      const vehicleRowData = data[vehicleRow];
      for (let i = 0; i < 35; i++) {
        const value = vehicleRowData[i];
        if (value && value > 0) {
          console.log(`  Column ${i}: ${value} (missed checkpoints)`);
        }
      }
      
      // Check if column 3 (index 3) corresponds to day 1
      console.log('\nChecking column mapping:');
      console.log(`Column 3 (index 3): "${headerRow[3]}" - should be day 1`);
      console.log(`Column 4 (index 4): "${headerRow[4]}" - should be day 2`);
      console.log(`Column 15 (index 15): "${headerRow[15]}" - should be day 16`);
      console.log(`Column 28 (index 28): "${headerRow[28]}" - should be day 29`);
      
      // Check the actual data for these columns
      console.log('\nActual data for key columns:');
      console.log(`Column 3 (index 3): ${vehicleRowData[3]} - day 1`);
      console.log(`Column 15 (index 15): ${vehicleRowData[15]} - day 16`);
      console.log(`Column 28 (index 28): ${vehicleRowData[28]} - day 29`);
      
    } else {
      console.log('Vehicle not found');
    }
  } else {
    console.log(`File ${fileName} not found`);
  }
  
} catch (error) {
  console.error('Error:', error.message);
} 