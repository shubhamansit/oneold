const fs = require('fs');

function removeDuplicateOctoberData() {
  try {
    console.log('🧹 Removing duplicate October 2025 data from zone files...\n');
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalDuplicatesRemoved = 0;
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\n🔄 Processing ${zoneName}...`);
      
      try {
        // Create backup
        const backupPath = `${filePath}.backup.before_dedup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const originalContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  💾 Created backup: ${backupPath}`);
        
        const data = JSON.parse(originalContent);
        console.log(`  Original records: ${data.length}`);
        
        let duplicatesRemoved = 0;
        
        // Update each job record to remove duplicate October data
        const updatedData = data.map(record => {
          const updatedRecord = { ...record };
          
          if (updatedRecord.more_details && Array.isArray(updatedRecord.more_details)) {
            // Filter October 2025 records
            const octoberRecords = updatedRecord.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            
            // Other records (non-October 2025)
            const otherRecords = updatedRecord.more_details.filter(detail => 
              !detail.Date || !detail.Date.startsWith('2025-10')
            );
            
            if (octoberRecords.length > 0) {
              // Remove duplicates from October records based on Date (and optionally Vehicle)
              // First, try to identify duplicates by exact date match
              const uniqueOctoberRecords = [];
              const seenDates = new Map(); // Map of date -> first record with that date
              
              octoberRecords.forEach(record => {
                const dateKey = record.Date.split(' ')[0]; // Get just the date part (YYYY-MM-DD)
                
                // Check if we've seen this date before
                if (!seenDates.has(dateKey)) {
                  seenDates.set(dateKey, record);
                  uniqueOctoberRecords.push(record);
                } else {
                  // Duplicate date found - check if it's truly a duplicate or different vehicle
                  const existingRecord = seenDates.get(dateKey);
                  const existingVehicle = existingRecord.Vehicle || '';
                  const currentVehicle = record.Vehicle || '';
                  
                  // If same vehicle, it's a duplicate - skip it
                  if (existingVehicle === currentVehicle || 
                      (existingVehicle && currentVehicle && existingVehicle.includes(currentVehicle)) ||
                      (existingVehicle && currentVehicle && currentVehicle.includes(existingVehicle))) {
                    duplicatesRemoved++;
                    if (duplicatesRemoved <= 50) { // Limit logging to first 50
                      console.log(`    🗑️  Removed duplicate: ${updatedRecord["Job Name"]} - ${dateKey}`);
                    }
                  } else {
                    // Different vehicle on same date - keep both (shouldn't happen, but handle it)
                    uniqueOctoberRecords.push(record);
                  }
                }
              });
              
              // Combine unique October records with other records
              updatedRecord.more_details = [...otherRecords, ...uniqueOctoberRecords];
              
              // Sort by date to keep records in chronological order
              updatedRecord.more_details.sort((a, b) => {
                const dateA = new Date(a.Date || 0);
                const dateB = new Date(b.Date || 0);
                return dateA - dateB;
              });
            }
          }
          
          return updatedRecord;
        });
        
        // Count final October records
        let finalOctoberRecords = 0;
        let vehiclesWithOctoberData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            if (records2025_10.length > 0) {
              vehiclesWithOctoberData++;
              finalOctoberRecords += records2025_10.length;
            }
          }
        });
        
        console.log(`  🗑️  Duplicates removed: ${duplicatesRemoved}`);
        console.log(`  ✅ Vehicles with October data: ${vehiclesWithOctoberData}/${updatedData.length}`);
        console.log(`  📅 Final October records: ${finalOctoberRecords}`);
        
        totalDuplicatesRemoved += duplicatesRemoved;
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 DEDUPLICATION SUMMARY:`);
    console.log(`🗑️  Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`🎉 Duplicate October 2025 data successfully removed from zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error removing duplicate October data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  removeDuplicateOctoberData();
}

module.exports = { removeDuplicateOctoberData };

