const fs = require('fs');

try {
  console.log('=== CHECKING GENERAL ARRAY VEHICLES ===');
  
  // Read the index.ts file
  const indexPath = 'data/index.ts';
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // Find the general array
  const generalMatch = content.match(/export const general = \[([\s\S]*?)\];/);
  
  if (!generalMatch) {
    console.error('❌ General array not found');
    return;
  }
  
  const generalContent = generalMatch[1];
  const generalData = eval(`([${generalContent}])`);
  
  console.log(`📊 General array has ${generalData.length} vehicles:`);
  
  generalData.forEach((vehicle, index) => {
    console.log(`${index + 1}. Job Name: "${vehicle["Job Name"]}"`);
    console.log(`   Vehicle: "${vehicle.Vehicle}"`);
    console.log(`   more_details count: ${vehicle.more_details ? vehicle.more_details.length : 0}`);
    
    // Check if it has July data
    if (vehicle.more_details && Array.isArray(vehicle.more_details)) {
      const julyRecords = vehicle.more_details.filter(detail => 
        detail.Date && detail.Date.startsWith('2025-07')
      );
      console.log(`   July 2025 records: ${julyRecords.length}`);
    }
    console.log('');
  });
  
  // Now check what vehicles we have in July data that might match general array
  const julyFile = 'monthlyData_2025_07.json';
  if (fs.existsSync(julyFile)) {
    const julyData = JSON.parse(fs.readFileSync(julyFile, 'utf8'));
    
    console.log('=== JULY DATA VEHICLES ===');
    const julyVehicles = [...new Set(julyData.map(record => record.Vehicle))];
    
    // Look for vehicles that might belong to general array
    console.log('Vehicles in July data that might be for general array:');
    julyVehicles.forEach(vehicle => {
      if (vehicle.includes('GJ 06 BX 0309') || vehicle.includes('GJ 06 BX 0386')) {
        console.log(`  - "${vehicle}"`);
      }
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
} 