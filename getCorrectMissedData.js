const XLSX = require('xlsx');

try {
  console.log('=== EXTRACTING CORRECT MISSED CHECKPOINT DATA ===');
  
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
        
        // Get the daily data (starting from column 4, which is index 3)
        const dailyData = data[vehicleRow].slice(3);
        console.log(`Daily data length: ${dailyData.length}`);
        
        // Extract the month from filename
        let month = '';
        if (file.includes('JAN')) month = '01';
        else if (file.includes('FEB')) month = '02';
        else if (file.includes('MARCH')) month = '03';
        else if (file.includes('APRIL') || file.includes('04')) month = '04';
        else if (file.includes('MAY') || file.includes('05')) month = '05';
        else if (file.includes('JUN') || file.includes('06')) month = '06';
        
        if (month) {
          allMissedData[month] = dailyData.map((value, index) => ({
            day: index + 1,
            missed: value || 0
          }));
          
          console.log(`Month ${month} data extracted`);
          console.log('Sample days:');
          allMissedData[month].slice(0, 10).forEach(day => {
            console.log(`  Day ${day.day}: ${day.missed} missed checkpoints`);
          });
          
          const nonZeroDays = allMissedData[month].filter(day => day.missed > 0);
          console.log(`Days with missed checkpoints: ${nonZeroDays.length}`);
          
          if (nonZeroDays.length > 0) {
            console.log('Days with missed checkpoints:');
            nonZeroDays.forEach(day => {
              console.log(`  Day ${day.day}: ${day.missed}`);
            });
          }
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
  
  // Save the extracted data
  const outputFile = 'GJ06BX0309_missedCheckpoints.json';
  require('fs').writeFileSync(outputFile, JSON.stringify(allMissedData, null, 2));
  console.log(`\n✅ Missed checkpoint data saved to: ${outputFile}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 