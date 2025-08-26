const fs = require('fs');

try {
  console.log('=== CHECKING JULY DATA IN INDEX.TS ===');
  
  // Read the index.ts file
  const indexPath = 'data/index.ts';
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // Find the general array
  const generalMatch = content.match(/export const general = \[([\s\S]*?)\];/);
  
  if (!generalMatch) {
    console.error('❌ General array not found');
    return false;
  }
  
  const generalContent = generalMatch[1];
  const generalData = eval(`([${generalContent}])`);
  
  console.log(`📊 General array has ${generalData.length} vehicles`);
  
  // Find the E-1-0309 KICHAN-WEST- vehicle
  const targetVehicle = generalData.find(record => record["Job Name"] === "E-1-0309 KICHAN-WEST-");
  
  if (!targetVehicle) {
    console.error('❌ E-1-0309 KICHAN-WEST- vehicle not found in general array');
    return false;
  }
  
  console.log(`✅ Found vehicle: ${targetVehicle["Job Name"]}`);
  console.log(`📊 Total more_details records: ${targetVehicle.more_details ? targetVehicle.more_details.length : 0}`);
  
  // Check for July 2025 records
  if (targetVehicle.more_details && Array.isArray(targetVehicle.more_details)) {
    const julyRecords = targetVehicle.more_details.filter(detail => 
      detail.Date && detail.Date.startsWith('2025-07')
    );
    
    console.log(`📅 July 2025 records found: ${julyRecords.length}`);
    
    if (julyRecords.length > 0) {
      console.log('\n📋 July 2025 records:');
      julyRecords.forEach((record, index) => {
        const date = record.Date.split(' ')[0];
        const missed = record['Missed Checkpoints'] || 0;
        const completion = record['Checkpoints Complete Status(%)'] || 0;
        console.log(`${index + 1}. ${date}: ${missed} missed, ${completion}% completion`);
      });
      
      // Check for the specific dates we added
      const specificDates = ['2025-07-10', '2025-07-13', '2025-07-16', '2025-07-19', '2025-07-24'];
      console.log('\n🔍 Checking for specific dates:');
      specificDates.forEach(date => {
        const record = julyRecords.find(r => r.Date.startsWith(date));
        if (record) {
          console.log(`✅ ${date}: ${record['Missed Checkpoints']} missed, ${record['Checkpoints Complete Status(%)']}% completion`);
        } else {
          console.log(`❌ ${date}: Not found`);
        }
      });
    } else {
      console.log('❌ No July 2025 records found');
    }
  } else {
    console.log('❌ No more_details array found');
  }
  
  // Also check the other vehicle in general array
  const otherVehicle = generalData.find(record => record["Job Name"] === "W-1-0386 KICHAN-WEST-");
  if (otherVehicle) {
    console.log(`\n📊 W-1-0386 KICHAN-WEST- vehicle:`);
    console.log(`📊 Total more_details records: ${otherVehicle.more_details ? otherVehicle.more_details.length : 0}`);
    
    if (otherVehicle.more_details && Array.isArray(otherVehicle.more_details)) {
      const julyRecords = otherVehicle.more_details.filter(detail => 
        detail.Date && detail.Date.startsWith('2025-07')
      );
      console.log(`📅 July 2025 records: ${julyRecords.length}`);
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
} 