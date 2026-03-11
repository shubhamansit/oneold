const fs = require('fs');

console.log('=== FIXING ROUTE 01-07-0078 ASSIGNMENTS ===');

try {
  // Read the August data file
  const augustDataPath = 'monthlyData_2025_08.json';
  let augustContent = fs.readFileSync(augustDataPath, 'utf8');
  
  // Create backup
  const backupPath = `monthlyData_2025_08_backup_route_fix_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(backupPath, augustContent);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Parse the JSON data
  const augustData = JSON.parse(augustContent);
  console.log(`📊 Total records in August data: ${augustData.length}`);
  
  // Find and remove GJ04GA0728 from route 01-07-0078 (it shouldn't be there)
  let removedGJ04GA0728 = 0;
  const cleanedData = augustData.filter(record => {
    if (record.Vehicle && record.Vehicle.includes('GJ04GA0728') && record.Vehicle.includes('01-07-0078')) {
      removedGJ04GA0728++;
      console.log(`🗑️ Removing GJ04GA0728 from route 01-07-0078: ${record.Vehicle}`);
      return false;
    }
    return true;
  });
  
  console.log(`🧹 Removed ${removedGJ04GA0728} GJ04GA0728 entries from route 01-07-0078`);
  
  // Check if GJ06BX0741 is properly in route 01-07-0078
  const gj06bx0741Entries = cleanedData.filter(record => 
    record.Vehicle && record.Vehicle.includes('GJ06BX0741')
  );
  
  console.log(`🔍 Found ${gj06bx0741Entries.length} GJ06BX0741 entries`);
  
  if (gj06bx0741Entries.length > 0) {
    console.log('📋 GJ06BX0741 entries:');
    gj06bx0741Entries.slice(0, 3).forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.Vehicle}`);
    });
    if (gj06bx0741Entries.length > 3) {
      console.log(`  ... and ${gj06bx0741Entries.length - 3} more`);
    }
  } else {
    console.log('❌ No GJ06BX0741 entries found in August data');
  }
  
  // Check for proper route format entries
  const properRouteEntries = cleanedData.filter(record => 
    record.Vehicle && record.Vehicle.includes('01-07-0078')
  );
  
  console.log(`\n📊 Route 01-07-0078 summary:`);
  console.log(`✅ Total entries in route 01-07-0078: ${properRouteEntries.length}`);
  
  if (properRouteEntries.length > 0) {
    console.log('📋 Vehicles in route 01-07-0078:');
    const uniqueVehicles = [...new Set(properRouteEntries.map(entry => entry.Vehicle))];
    uniqueVehicles.forEach((vehicle, index) => {
      console.log(`  ${index + 1}. ${vehicle}`);
    });
  }
  
  // Write the cleaned data back to file
  fs.writeFileSync(augustDataPath, JSON.stringify(cleanedData, null, 2));
  console.log(`✅ August data updated and saved`);
  
  console.log('\n✅ Route 01-07-0078 fix completed!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}