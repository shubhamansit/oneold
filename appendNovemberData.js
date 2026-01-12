const fs = require('fs');
const path = require('path');

function appendNovemberData() {
  try {
    console.log('📅 Appending November 2025 data to zone JSON files...');
    
    // Load November monthly data
    const novemberFile = 'monthlyData_2025_11.json';
    if (!fs.existsSync(novemberFile)) {
      console.error(`❌ November data file not found: ${novemberFile}`);
      return false;
    }
    
    const novemberData = JSON.parse(fs.readFileSync(novemberFile, 'utf8'));
    console.log(`📅 Loaded November data: ${novemberData.length} records`);
    
    // Create a map of November vehicles for easy lookup
    const novemberVehicleMap = new Map();
    novemberData.forEach(record => {
      if (!novemberVehicleMap.has(record.Vehicle)) {
        novemberVehicleMap.set(record.Vehicle, []);
      }
      novemberVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`📊 Total unique vehicles in November data: ${novemberVehicleMap.size}`);
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalMappings = 0;
    let totalAppended = 0;
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\n🔄 Processing ${zoneName}...`);
      
      try {
        // Create backup
        const backupPath = `${filePath}.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const originalContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  💾 Created backup: ${backupPath}`);
        
        const data = JSON.parse(originalContent);
        console.log(`  Original records: ${data.length}`);
        
        // Update each job record with November data
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
            
            // Try multiple matching strategies for this vehicle
            const jobName = updatedRecord["Job Name"];
            let foundMatch = false;
            
            // Strategy 1: Extract route code and find matching November vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find November vehicle that contains this route code
              for (const [novemberVehicle, novemberRecords] of novemberVehicleMap.entries()) {
                // Try exact route code match
                if (novemberVehicle.includes(routeCode)) {
                  console.log(`    ✅ Found match: "${jobName}" ↔ "${novemberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  // Add all November records for this vehicle
                  novemberRecords.forEach(novemberRecord => {
                    const dateKey = novemberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, novemberRecord);
                    totalAppended++;
                  });
                  break; // Found the match, no need to continue
                }
                
                // Try matching with different formats
                // For "01-08-0426" match "GJ 04 GB 0426 01-08 - ENTRA"
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                // Check if November vehicle has the route parts in different order
                if (novemberVehicle.includes(last4) && novemberVehicle.includes(firstPart)) {
                  console.log(`    ✅ Found match (format variant): "${jobName}" ↔ "${novemberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  novemberRecords.forEach(novemberRecord => {
                    const dateKey = novemberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, novemberRecord);
                    totalAppended++;
                  });
                  break;
                }
              }
            }
            
            // Strategy 1b: Handle special route formats (W-1-0386, E-1-0309, etc.)
            if (!foundMatch) {
              const specialRouteMatch = jobName.match(/([WE]-\d+-\d{4})/);
              if (specialRouteMatch) {
                const specialRoute = specialRouteMatch[1];
                const routeParts = specialRoute.split('-');
                const vehicleNum = routeParts[2];
                const routePrefix = `${routeParts[0]}-${routeParts[1]}`;
                
                for (const [novemberVehicle, novemberRecords] of novemberVehicleMap.entries()) {
                  // Match vehicles like "GJ 06 BX 0386 W-1 - TRUCK" with "W-1-0386"
                  if (novemberVehicle.includes(vehicleNum) && novemberVehicle.includes(routePrefix)) {
                    console.log(`    ✅ Found match (special format): "${jobName}" ↔ "${novemberVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    novemberRecords.forEach(novemberRecord => {
                      const dateKey = novemberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, novemberRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Strategy 2: Try partial matching if no exact route match
            if (!foundMatch && routeMatch) {
              const routeCode = routeMatch[1];
              const routeParts = routeCode.split('-');
              const last4 = routeParts[2];
              
              for (const [novemberVehicle, novemberRecords] of novemberVehicleMap.entries()) {
                // Try matching with different formats
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedNovember = novemberVehicle.replace(/[-\s]/g, '');
                
                // Check if November vehicle contains the route code parts
                if (novemberVehicle.includes(routeCode) || 
                    normalizedNovember.includes(normalizedRoute) ||
                    novemberVehicle.includes(last4)) {
                  console.log(`    🔗 Partial match: "${jobName}" ↔ "${novemberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  novemberRecords.forEach(novemberRecord => {
                    const dateKey = novemberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, novemberRecord);
                    totalAppended++;
                  });
                  break;
                }
              }
            }
            
            // Strategy 2b: Handle "ROUTE XX-XX" format (e.g., "ROUTE 04-10" should match "04-10-0309")
            if (!foundMatch) {
              const routeFormatMatch = jobName.match(/ROUTE\s+(\d{2}-\d{2})/);
              if (routeFormatMatch) {
                const routePrefix = routeFormatMatch[1];
                
                for (const [novemberVehicle, novemberRecords] of novemberVehicleMap.entries()) {
                  // Match vehicles like "GJ 04 GB 0309 ROUTE 04-10 - TRUCK" with job "04-10-0309"
                  if (novemberVehicle.includes(`ROUTE ${routePrefix}`) || novemberVehicle.includes(routePrefix)) {
                    // Also check if the vehicle number matches
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (novemberVehicle.includes(vehicleNum)) {
                        console.log(`    ✅ Found match (ROUTE format): "${jobName}" ↔ "${novemberVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        novemberRecords.forEach(novemberRecord => {
                          const dateKey = novemberRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, novemberRecord);
                          totalAppended++;
                        });
                        break;
                      }
                    }
                  }
                }
              }
            }
            
            // Strategy 3: Try matching by vehicle number from Job Name
            if (!foundMatch) {
              const vehicleNumberMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
              if (vehicleNumberMatch) {
                const vehicleNumber = vehicleNumberMatch[1];
                
                for (const [novemberVehicle, novemberRecords] of novemberVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedNovember = novemberVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedNovember.includes(normalizedVehicle) || 
                      novemberVehicle.includes(vehicleNumber)) {
                    console.log(`    🔗 Vehicle number match: "${jobName}" ↔ "${novemberVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    novemberRecords.forEach(novemberRecord => {
                      const dateKey = novemberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, novemberRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + November)
            updatedRecord.more_details = Array.from(existingDates.values());
          }
          
          return updatedRecord;
        });
        
        // Count November records
        let novemberRecords = 0;
        let vehiclesWithNovemberData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_11 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-11')
            );
            if (records2025_11.length > 0) {
              vehiclesWithNovemberData++;
              novemberRecords += records2025_11.length;
            }
          }
        });
        
        console.log(`  ✅ Vehicles with November data: ${vehiclesWithNovemberData}/${updatedData.length}`);
        console.log(`  📅 November records: ${novemberRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 NOVEMBER APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total November records appended: ${totalAppended}`);
    console.log(`🎉 November 2025 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending November data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendNovemberData();
}

module.exports = { appendNovemberData };
