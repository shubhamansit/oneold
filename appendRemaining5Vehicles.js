const fs = require('fs');

function appendRemaining5Vehicles() {
  try {
    console.log('📅 Appending remaining 5 unmapped vehicles to zone JSON files...\n');
    
    // Load October monthly data
    const octoberFile = 'monthlyData_2025_10.json';
    if (!fs.existsSync(octoberFile)) {
      console.error(`❌ October data file not found: ${octoberFile}`);
      return false;
    }
    
    const octoberData = JSON.parse(fs.readFileSync(octoberFile, 'utf8'));
    console.log(`📅 Loaded October data: ${octoberData.length} records`);
    
    // The 5 vehicles that need to be appended
    const targetVehicles = [
      'GJ 04 GB 0426 01-08 - ENTRA',
      'GJ-06-BX-0761 - ENTRA',
      'GJ 04 GB 0309 ROUTE 04-10 - TRUCK',
      'GJ 06 BX 0386 W-1 - TRUCK',
      'GJ 06 BX 0309  E-1 - truck'
    ];
    
    // Create a map of October vehicles for these 5
    const octoberVehicleMap = new Map();
    targetVehicles.forEach(vehicleName => {
      const vehicleRecords = octoberData.filter(record => record.Vehicle === vehicleName);
      if (vehicleRecords.length > 0) {
        octoberVehicleMap.set(vehicleName, vehicleRecords);
        console.log(`📊 Found ${vehicleRecords.length} October records for: ${vehicleName}`);
      }
    });
    
    console.log(`\n📊 Total vehicles to append: ${octoberVehicleMap.size}\n`);
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalMappings = 0;
    let totalAppended = 0;
    
    // Define matching patterns for each vehicle
    const vehicleMatchingPatterns = {
      'GJ 04 GB 0426 01-08 - ENTRA': [
        /01-08-0426/i,
        /0426.*01-08/i,
        /01-08.*0426/i
      ],
      'GJ-06-BX-0761 - ENTRA': [
        /GJ-06-BX-0761/i,
        /0761/i,
        /12-07-0761/i
      ],
      'GJ 04 GB 0309 ROUTE 04-10 - TRUCK': [
        /04-10-0309/i,
        /0309.*ROUTE.*04-10/i,
        /04-10.*0309/i
      ],
      'GJ 06 BX 0386 W-1 - TRUCK': [
        /W-1-0386/i,
        /0386.*W-1/i,
        /W-1.*0386/i
      ],
      'GJ 06 BX 0309  E-1 - truck': [
        /E-1-0309/i,
        /0309.*E-1/i,
        /E-1.*0309/i
      ]
    };
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\n🔄 Processing ${zoneName}...`);
      
      try {
        // Create backup
        const backupPath = `${filePath}.backup.before_append5_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const originalContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  💾 Created backup: ${backupPath}`);
        
        const data = JSON.parse(originalContent);
        console.log(`  Original records: ${data.length}`);
        
        // Update each job record with October data for the 5 vehicles
        const updatedData = data.map(record => {
          const updatedRecord = { ...record };
          
          // Only process if this is a real vehicle (not a placeholder)
          const isPlaceholder = (
            updatedRecord.Branch === "--" &&
            updatedRecord.Town === "--" &&
            updatedRecord.Zone === "--" &&
            updatedRecord.Ward === "--" &&
            updatedRecord["Job Type"] === "--" &&
            updatedRecord["Total Jobs"] === 0 &&
            updatedRecord.Completed === 0 &&
            updatedRecord["Completed With Issue"] === 0 &&
            updatedRecord.Failed === 0 &&
            updatedRecord.Penalty === 0 &&
            updatedRecord["Assigned Helpers"] === "--" &&
            updatedRecord.Incidents === 0
          );
          
          if (isPlaceholder) {
            return updatedRecord;
          }
          
          if (updatedRecord.more_details && Array.isArray(updatedRecord.more_details)) {
            // Create a map of existing dates to avoid duplicates
            const existingDates = new Map();
            updatedRecord.more_details.forEach(detail => {
              if (detail.Date) {
                const dateKey = detail.Date.split(' ')[0];
                existingDates.set(dateKey, detail);
              }
            });
            
            const jobName = updatedRecord["Job Name"] || '';
            let foundMatch = false;
            
            // Try to match each of the 5 vehicles
            for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
              const patterns = vehicleMatchingPatterns[octoberVehicle] || [];
              
              // Check if job name matches any pattern
              for (const pattern of patterns) {
                if (pattern.test(jobName)) {
                  console.log(`    ✅ Found match: "${jobName}" ↔ "${octoberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  // Add all October records for this vehicle
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    // Only add if it doesn't already exist
                    if (!existingDates.has(dateKey)) {
                      existingDates.set(dateKey, octoberRecord);
                      totalAppended++;
                    }
                  });
                  break; // Found the match, no need to continue
                }
              }
              
              if (foundMatch) break;
            }
            
            // Also check vehicle names in more_details for additional matching
            if (!foundMatch && updatedRecord.more_details.length > 0) {
              const firstDetail = updatedRecord.more_details[0];
              const detailVehicle = firstDetail?.Vehicle || '';
              
              for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
                // Normalize vehicle names for comparison
                const normalizedOctober = octoberVehicle.replace(/[-\s]/g, '').toUpperCase();
                const normalizedDetail = detailVehicle.replace(/[-\s]/g, '').toUpperCase();
                
                // Check if vehicles match (exact or contains)
                if (normalizedOctober === normalizedDetail || 
                    normalizedOctober.includes(normalizedDetail) ||
                    normalizedDetail.includes(normalizedOctober)) {
                  console.log(`    ✅ Found match (by vehicle): "${jobName}" ↔ "${octoberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    if (!existingDates.has(dateKey)) {
                      existingDates.set(dateKey, octoberRecord);
                      totalAppended++;
                    }
                  });
                  break;
                }
              }
            }
            
            // Update more_details with all records (existing + October)
            updatedRecord.more_details = Array.from(existingDates.values());
          }
          
          return updatedRecord;
        });
        
        // Count October records for the 5 vehicles
        let octoberRecords = 0;
        let vehiclesWithOctoberData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            if (records2025_10.length > 0) {
              // Check if any of the records are from our 5 target vehicles
              const hasTargetVehicle = records2025_10.some(detail => 
                targetVehicles.some(tv => detail.Vehicle === tv)
              );
              if (hasTargetVehicle) {
                vehiclesWithOctoberData++;
                octoberRecords += records2025_10.filter(detail => 
                  targetVehicles.some(tv => detail.Vehicle === tv)
                ).length;
              }
            }
          }
        });
        
        console.log(`  ✅ Vehicles with October data (from 5 targets): ${vehiclesWithOctoberData}`);
        console.log(`  📅 October records added (from 5 targets): ${octoberRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total October records appended: ${totalAppended}`);
    console.log(`🎉 Remaining 5 vehicles successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending remaining vehicles:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendRemaining5Vehicles();
}

module.exports = { appendRemaining5Vehicles };

