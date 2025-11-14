const fs = require('fs');

function checkCrossZoneDuplicates() {
  try {
    console.log('🔍 Checking for vehicles with October data appearing in multiple zone files...\n');
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    // Map to track which vehicles appear in which zones
    const vehicleZoneMap = new Map();
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      data.forEach(record => {
        if (record.more_details && Array.isArray(record.more_details)) {
          const octoberRecords = record.more_details.filter(detail => 
            detail.Date && detail.Date.startsWith('2025-10')
          );
          
          if (octoberRecords.length > 0) {
            const jobName = record["Job Name"];
            const vehicle = octoberRecords[0]?.Vehicle || 'Unknown';
            
            if (!vehicleZoneMap.has(jobName)) {
              vehicleZoneMap.set(jobName, {
                vehicle: vehicle,
                zones: [],
                recordCount: 0
              });
            }
            
            const entry = vehicleZoneMap.get(jobName);
            if (!entry.zones.includes(zoneName)) {
              entry.zones.push(zoneName);
            }
            entry.recordCount += octoberRecords.length;
          }
        }
      });
    });
    
    // Find vehicles in multiple zones
    const multiZoneVehicles = [];
    vehicleZoneMap.forEach((info, jobName) => {
      if (info.zones.length > 1) {
        multiZoneVehicles.push({
          jobName,
          vehicle: info.vehicle,
          zones: info.zones,
          recordCount: info.recordCount
        });
      }
    });
    
    console.log(`📊 Total vehicles with October data: ${vehicleZoneMap.size}`);
    console.log(`📊 Vehicles in multiple zones: ${multiZoneVehicles.length}\n`);
    
    if (multiZoneVehicles.length > 0) {
      console.log('⚠️  Vehicles appearing in multiple zones:');
      multiZoneVehicles.slice(0, 20).forEach(item => {
        console.log(`   - "${item.jobName}" (${item.vehicle})`);
        console.log(`     Zones: ${item.zones.join(', ')}`);
        console.log(`     Total October records: ${item.recordCount}`);
        console.log('');
      });
      if (multiZoneVehicles.length > 20) {
        console.log(`   ... and ${multiZoneVehicles.length - 20} more`);
      }
    } else {
      console.log('✅ No vehicles appear in multiple zones');
    }
    
    // Also check for exact duplicate records across zones
    console.log('\n🔍 Checking for exact duplicate October records across zones...');
    const duplicateRecords = new Map();
    
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      data.forEach(record => {
        if (record.more_details && Array.isArray(record.more_details)) {
          const octoberRecords = record.more_details.filter(detail => 
            detail.Date && detail.Date.startsWith('2025-10')
          );
          
          octoberRecords.forEach(octoberRecord => {
            const key = `${octoberRecord.Vehicle}|${octoberRecord.Date}`;
            
            if (!duplicateRecords.has(key)) {
              duplicateRecords.set(key, []);
            }
            
            duplicateRecords.get(key).push({
              zone: zoneName,
              jobName: record["Job Name"]
            });
          });
        }
      });
    });
    
    const crossZoneDuplicates = [];
    duplicateRecords.forEach((locations, key) => {
      if (locations.length > 1) {
        const [vehicle, date] = key.split('|');
        const uniqueZones = [...new Set(locations.map(l => l.zone))];
        if (uniqueZones.length > 1) {
          crossZoneDuplicates.push({
            vehicle,
            date,
            locations
          });
        }
      }
    });
    
    if (crossZoneDuplicates.length > 0) {
      console.log(`⚠️  Found ${crossZoneDuplicates.length} October records appearing in multiple zones:`);
      crossZoneDuplicates.slice(0, 10).forEach(dup => {
        console.log(`   - ${dup.vehicle} on ${dup.date}:`);
        dup.locations.forEach(loc => {
          console.log(`     - ${loc.zone}: "${loc.jobName}"`);
        });
      });
      if (crossZoneDuplicates.length > 10) {
        console.log(`   ... and ${crossZoneDuplicates.length - 10} more`);
      }
    } else {
      console.log('✅ No exact duplicate records found across zones');
    }
    
    return { multiZoneVehicles, crossZoneDuplicates };
    
  } catch (error) {
    console.error('❌ Error checking for cross-zone duplicates:', error);
    return { multiZoneVehicles: [], crossZoneDuplicates: [] };
  }
}

// Run the function
if (require.main === module) {
  checkCrossZoneDuplicates();
}

module.exports = { checkCrossZoneDuplicates };

