const fs = require('fs');

console.log('=== FIXING AUGUST ORPHANED VEHICLES ===');

try {
  // Read the August data file
  const augustDataPath = 'monthlyData_2025_08.json';
  let augustContent = fs.readFileSync(augustDataPath, 'utf8');
  
  // Create backup
  const backupPath = `monthlyData_2025_08_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(backupPath, augustContent);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Parse the JSON data
  const augustData = JSON.parse(augustContent);
  console.log(`📊 Total records in August data: ${augustData.length}`);
  
  // Define the orphaned vehicle patterns (just vehicle numbers without route info)
  const orphanedVehicles = [
    'GJ06BX0741',
    'GJ06BX0908', 
    'GJ06BX0275',
    'GJ06BX0334'
  ];
  
  // Count orphaned entries before removal
  let orphanedCount = 0;
  augustData.forEach(record => {
    if (orphanedVehicles.includes(record.Vehicle)) {
      orphanedCount++;
    }
  });
  
  console.log(`🔍 Found ${orphanedCount} orphaned vehicle entries`);
  
  // Filter out orphaned entries (keep only records with full route information)
  const cleanedData = augustData.filter(record => {
    // Keep records that are NOT orphaned vehicle numbers
    return !orphanedVehicles.includes(record.Vehicle);
  });
  
  console.log(`🧹 Removed ${augustData.length - cleanedData.length} orphaned entries`);
  console.log(`📊 Remaining records: ${cleanedData.length}`);
  
  // Verify that correct entries with full route info still exist
  const correctEntries = cleanedData.filter(record => 
    record.Vehicle && record.Vehicle.includes('RUT')
  );
  
  console.log(`✅ Records with full route information: ${correctEntries.length}`);
  
  // Write the cleaned data back to file
  fs.writeFileSync(augustDataPath, JSON.stringify(cleanedData, null, 2));
  console.log(`✅ August data cleaned and saved`);
  
  // Show summary of what was removed
  console.log('\n📋 Summary of removed orphaned entries:');
  orphanedVehicles.forEach(vehicle => {
    const count = augustData.length - cleanedData.length;
    console.log(`- ${vehicle}: ${count} orphaned entries removed`);
  });
  
  console.log('\n✅ August orphaned vehicles fix completed!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}