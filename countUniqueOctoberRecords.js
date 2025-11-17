const fs = require('fs');

function countUniqueOctoberRecords() {
  try {
    console.log('📊 Counting UNIQUE October 2025 records (deduplicated across zones)...\n');
    
    // Load the source October data to know what we expect
    const octoberFile = 'monthlyData_2025_10.json';
    const octoberData = JSON.parse(fs.readFileSync(octoberFile, 'utf8'));
    const uniqueVehicles = [...new Set(octoberData.map(r => r.Vehicle))];
    const expectedRecords = octoberData.length;
    
    console.log(`📅 Source October data:`);
    console.log(`   Total records: ${expectedRecords}`);
    console.log(`   Unique vehicles: ${uniqueVehicles.length}`);
    console.log(`   Expected unique records: ${expectedRecords}\n`);
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    // Collect all unique October records across all zones
    const uniqueOctoberRecords = new Map(); // Key: vehicle|date, Value: record
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let zoneCount = 0;
        
        data.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            
            records2025_10.forEach(detail => {
              const vehicle = detail.Vehicle || 'Unknown';
              const dateKey = detail.Date.split(' ')[0]; // YYYY-MM-DD
              const uniqueKey = `${vehicle}|${dateKey}`;
              
              // Only add if we haven't seen this vehicle+date combination before
              if (!uniqueOctoberRecords.has(uniqueKey)) {
                uniqueOctoberRecords.set(uniqueKey, detail);
                zoneCount++;
              }
            });
          }
        });
        
        console.log(`  ${zoneName}: ${zoneCount} unique October records added`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 UNIQUE RECORD COUNT:`);
    console.log(`   Total unique October records (across all zones): ${uniqueOctoberRecords.size}`);
    console.log(`   Expected from source: ${expectedRecords}`);
    console.log(`   Difference: ${uniqueOctoberRecords.size - expectedRecords}`);
    
    // Also count by zone (non-deduplicated)
    console.log(`\n📊 ZONE-BY-ZONE COUNT (includes duplicates across zones):`);
    let totalAcrossZones = 0;
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let zoneCount = 0;
        
        data.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            zoneCount += records2025_10.length;
          }
        });
        
        console.log(`   ${zoneName}: ${zoneCount} records`);
        totalAcrossZones += zoneCount;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    });
    
    console.log(`\n   Total across all zones (with duplicates): ${totalAcrossZones}`);
    console.log(`   Unique records (deduplicated): ${uniqueOctoberRecords.size}`);
    console.log(`   Duplicates across zones: ${totalAcrossZones - uniqueOctoberRecords.size}`);
    
    return {
      uniqueCount: uniqueOctoberRecords.size,
      totalAcrossZones,
      expectedRecords
    };
    
  } catch (error) {
    console.error('❌ Error counting unique October records:', error);
    return null;
  }
}

// Run the function
if (require.main === module) {
  countUniqueOctoberRecords();
}

module.exports = { countUniqueOctoberRecords };

