const fs = require('fs');

function countOctoberRecords() {
  try {
    console.log('📊 Counting October 2025 records across all zone files...\n');
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalOctoberRecords = 0;
    let totalVehiclesWithOctober = 0;
    const zoneStats = [];
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        let octoberRecords = 0;
        let vehiclesWithOctober = 0;
        const vehicleCounts = new Map();
        
        data.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            
            if (records2025_10.length > 0) {
              vehiclesWithOctober++;
              octoberRecords += records2025_10.length;
              
              // Count unique vehicles
              const vehicle = records2025_10[0]?.Vehicle || 'Unknown';
              if (!vehicleCounts.has(vehicle)) {
                vehicleCounts.set(vehicle, 0);
              }
              vehicleCounts.set(vehicle, vehicleCounts.get(vehicle) + records2025_10.length);
            }
          }
        });
        
        zoneStats.push({
          name: zoneName,
          totalRecords: data.length,
          vehiclesWithOctober,
          octoberRecords,
          uniqueVehicles: vehicleCounts.size
        });
        
        totalOctoberRecords += octoberRecords;
        totalVehiclesWithOctober += vehiclesWithOctober;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    // Display results
    console.log('📊 ZONE-BY-ZONE BREAKDOWN:\n');
    zoneStats.forEach(stat => {
      console.log(`  ${stat.name}:`);
      console.log(`    Total job records: ${stat.totalRecords}`);
      console.log(`    Vehicles with October data: ${stat.vehiclesWithOctober}`);
      console.log(`    Unique vehicles: ${stat.uniqueVehicles}`);
      console.log(`    October 2025 records: ${stat.octoberRecords}`);
      console.log('');
    });
    
    console.log('📊 SUMMARY:');
    console.log(`  Total October 2025 records: ${totalOctoberRecords}`);
    console.log(`  Total vehicles with October data: ${totalVehiclesWithOctober}`);
    console.log(`  Expected records (31 days × 142 vehicles): ${31 * 142} = ${4402}`);
    console.log(`  Coverage: ${((totalOctoberRecords / (31 * 142)) * 100).toFixed(2)}%`);
    
    return {
      totalOctoberRecords,
      totalVehiclesWithOctober,
      zoneStats
    };
    
  } catch (error) {
    console.error('❌ Error counting October records:', error);
    return null;
  }
}

// Run the function
if (require.main === module) {
  countOctoberRecords();
}

module.exports = { countOctoberRecords };

