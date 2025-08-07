const XLSX = require('xlsx');

try {
  console.log('=== FIXING CORRECT DAY MAPPING ===');
  
  const excelFiles = [
    { file: 'JAN - 2025.xlsx', vehicle: 'GJ 06 BX 0309 E-1' },
    { file: 'FEB -2025.xlsx', vehicle: 'GJ 06 BX 0309 E1' },
    { file: 'MARCH -2025.xlsx', vehicle: 'GJ 06 BX 0309 E1' },
    { file: '05 MAY 2025 NEW DB.xlsx', vehicle: 'GJ 06 BX 0309 E1' },
    { file: '06 JUN 2025 NEW DB.xlsx', vehicle: 'GJ 06 BX 0309 E1' }
  ];
  
  const allMissedData = {};
  
  excelFiles.forEach(({ file, vehicle }) => {
    if (require('fs').existsSync(file)) {
      console.log(`\n--- ${file} ---`);
      
      const workbook = XLSX.readFile(file);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find the vehicle row
      let vehicleRow = null;
      for (let row = 0; row < data.length; row++) {
        if (data[row][2] && data[row][2].toString() === vehicle) {
          vehicleRow = row;
          break;
        }
      }
      
      if (vehicleRow !== null) {
        console.log(`Found vehicle at row ${vehicleRow}: "${data[vehicleRow][2]}"`);
        
        // Get the header row (row 1) which contains the day numbers
        const headerRow = data[1];
        const vehicleRowData = data[vehicleRow];
        
        // Extract the month from filename
        let month = '';
        if (file.includes('JAN')) month = '01';
        else if (file.includes('FEB')) month = '02';
        else if (file.includes('MARCH')) month = '03';
        else if (file.includes('APRIL') || file.includes('04')) month = '04';
        else if (file.includes('MAY') || file.includes('05')) month = '05';
        else if (file.includes('JUN') || file.includes('06')) month = '06';
        
        if (month) {
          const monthData = [];
          
          // Start from column 3 (index 3) which contains day numbers
          for (let col = 3; col < headerRow.length; col++) {
            const dayHeader = headerRow[col];
            const missedValue = vehicleRowData[col];
            
            // Skip if it's not a day number (like "TOTAL")
            if (dayHeader && !isNaN(parseInt(dayHeader)) && dayHeader !== 'TOTAL') {
              const day = parseInt(dayHeader);
              const missed = missedValue || 0;
              
              monthData.push({
                day: day,
                missed: missed
              });
              
              if (missed > 0) {
                console.log(`  Day ${day}: ${missed} missed checkpoints`);
              }
            }
          }
          
          allMissedData[month] = monthData;
          console.log(`Month ${month}: ${monthData.length} days processed`);
        }
      } else {
        console.log(`Vehicle "${vehicle}" not found in ${file}`);
      }
    }
  });
  
  console.log('\n=== SUMMARY ===');
  Object.keys(allMissedData).forEach(month => {
    const data = allMissedData[month];
    const nonZeroDays = data.filter(day => day.missed > 0);
    console.log(`Month ${month}: ${nonZeroDays.length} days with missed checkpoints`);
  });
  
  // Save the corrected data
  const outputFile = 'GJ06BX0309_CorrectDayMapping.json';
  require('fs').writeFileSync(outputFile, JSON.stringify(allMissedData, null, 2));
  console.log(`\n✅ Corrected day mapping data saved to: ${outputFile}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 