const fs = require('fs');

try {
  console.log('=== CHECKING MISSED CHECKPOINTS DATA ===');
  
  const targetVehicle = 'GJ 06 BX 0309  E-1 - truck';
  
  for (let month = 1; month <= 6; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const fileName = `monthlyData_2025_${monthStr}.json`;
    
    if (fs.existsSync(fileName)) {
      const data = JSON.parse(fs.readFileSync(fileName, 'utf8'));
      const monthData = data.filter(record => record.Vehicle === targetVehicle);
      
      console.log(`\nMonth ${monthStr}:`);
      console.log(`Total records: ${monthData.length}`);
      
      // Check missed checkpoints
      const missedCheckpoints = monthData.map(record => record['Missed Checkpoints']);
      const nonZeroMissed = missedCheckpoints.filter(missed => missed > 0);
      
      console.log(`Missed checkpoints > 0: ${nonZeroMissed.length}/${monthData.length}`);
      
      if (nonZeroMissed.length > 0) {
        console.log('Sample records with missed checkpoints:');
        monthData.slice(0, 3).forEach((record, i) => {
          console.log(`  Record ${i+1}:`);
          console.log(`    Date: ${record.Date}`);
          console.log(`    Missed: ${record['Missed Checkpoints']}`);
          console.log(`    Visited: ${record['Total Visited Checkpoints']}`);
          console.log(`    Planned: ${record['Planned Checkpoints']}`);
        });
      } else {
        console.log('  All missed checkpoints are 0!');
      }
    }
  }
  
  // Check the original Excel data to see what it should be
  console.log('\n=== CHECKING ORIGINAL EXCEL DATA ===');
  
  // Check if we have the Excel file or patterns
  const excelFiles = ['missedCheckpointPatterns.json', 'missedCheckpointPatterns_01.json'];
  
  excelFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`\nFound ${file}:`);
      const patterns = JSON.parse(fs.readFileSync(file, 'utf8'));
      
      // Look for GJ06BX0309 pattern
      const vehiclePattern = patterns.find(pattern => 
        pattern.vehicle && pattern.vehicle.includes('GJ06BX0309')
      );
      
      if (vehiclePattern) {
        console.log('Found vehicle pattern:');
        console.log(`Vehicle: ${vehiclePattern.vehicle}`);
        console.log(`Pattern: ${vehiclePattern.pattern}`);
        console.log(`Sample days: ${vehiclePattern.pattern.slice(0, 10)}`);
      } else {
        console.log('No pattern found for GJ06BX0309');
      }
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
} 