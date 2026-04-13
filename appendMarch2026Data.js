const fs = require('fs');
const path = require('path');

function appendMarch2026Data() {
  try {
    console.log('📅 Appending March 2026 data to zone JSON files...');
    
    // Load March 2026 monthly data
    const marchFile = 'monthlyData_2026_03.json';
    if (!fs.existsSync(marchFile)) {
      console.error(`❌ March 2026 data file not found: ${marchFile}`);
      return false;
    }
    
    const marchData = JSON.parse(fs.readFileSync(marchFile, 'utf8'));
    console.log(`📅 Loaded March 2026 data: ${marchData.length} records`);
    
    // Create a map of March vehicles for easy lookup
    const marchVehicleMap = new Map();
    marchData.forEach(record => {
      if (!marchVehicleMap.has(record.Vehicle)) {
        marchVehicleMap.set(record.Vehicle, []);
      }
      marchVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`📊 Total unique vehicles in March 2026 data: ${marchVehicleMap.size}`);
    
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
        
        // Update each job record with March 2026 data
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
          
          if (!Array.isArray(updatedRecord.more_details)) {
            updatedRecord.more_details = [];
          }

            const jobName = updatedRecord["Job Name"];
            if (!jobName || typeof jobName !== "string") {
              return updatedRecord;
            }

            // Create a map of existing dates to avoid duplicates
            const existingDates = new Map();
            updatedRecord.more_details.forEach(detail => {
              if (detail.Date) {
                const dateKey = detail.Date.split(' ')[0];
                existingDates.set(dateKey, detail);
              }
            });
            
            // Try multiple matching strategies for this vehicle
            let foundMatch = false;
            
            // Strategy 1: Extract route code and find matching March vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find March vehicle that contains this route code
              for (const [marchVehicle, marchRecords] of marchVehicleMap.entries()) {
                // Try exact route code match
                if (marchVehicle.includes(routeCode)) {
                  console.log(`    ✅ Found match: "${jobName}" ↔ "${marchVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  marchRecords.forEach(marchRecord => {
                    const dateKey = marchRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, marchRecord);
                    totalAppended++;
                  });
                  break;
                }
                
                // Try matching with different formats
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                if (marchVehicle.includes(last4) && marchVehicle.includes(firstPart)) {
                  console.log(`    ✅ Found match (format variant): "${jobName}" ↔ "${marchVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  marchRecords.forEach(marchRecord => {
                    const dateKey = marchRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, marchRecord);
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
                
                for (const [marchVehicle, marchRecords] of marchVehicleMap.entries()) {
                  if (marchVehicle.includes(vehicleNum) && marchVehicle.includes(routePrefix)) {
                    console.log(`    ✅ Found match (special format): "${jobName}" ↔ "${marchVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    marchRecords.forEach(marchRecord => {
                      const dateKey = marchRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, marchRecord);
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
              
              for (const [marchVehicle, marchRecords] of marchVehicleMap.entries()) {
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedMarch = marchVehicle.replace(/[-\s]/g, '');
                
                if (marchVehicle.includes(routeCode) || 
                    normalizedMarch.includes(normalizedRoute) ||
                    marchVehicle.includes(last4)) {
                  console.log(`    🔗 Partial match: "${jobName}" ↔ "${marchVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  marchRecords.forEach(marchRecord => {
                    const dateKey = marchRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, marchRecord);
                    totalAppended++;
                  });
                  break;
                }
              }
            }
            
            // Strategy 2b: Handle "ROUTE XX-XX" format
            if (!foundMatch) {
              const routeFormatMatch = jobName.match(/ROUTE\s+(\d{2}-\d{2})/);
              if (routeFormatMatch) {
                const routePrefix = routeFormatMatch[1];
                
                for (const [marchVehicle, marchRecords] of marchVehicleMap.entries()) {
                  if (marchVehicle.includes(`ROUTE ${routePrefix}`) || marchVehicle.includes(routePrefix)) {
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (marchVehicle.includes(vehicleNum)) {
                        console.log(`    ✅ Found match (ROUTE format): "${jobName}" ↔ "${marchVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        marchRecords.forEach(marchRecord => {
                          const dateKey = marchRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, marchRecord);
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
                
                for (const [marchVehicle, marchRecords] of marchVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedMarch = marchVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedMarch.includes(normalizedVehicle) || 
                      marchVehicle.includes(vehicleNumber)) {
                    console.log(`    🔗 Vehicle number match: "${jobName}" ↔ "${marchVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    marchRecords.forEach(marchRecord => {
                      const dateKey = marchRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, marchRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + March 2026)
            updatedRecord.more_details = Array.from(existingDates.values());
          
          return updatedRecord;
        });
        
        // Count March 2026 records
        let marchRecords = 0;
        let vehiclesWithMarchData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2026_03 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2026-03')
            );
            if (records2026_03.length > 0) {
              vehiclesWithMarchData++;
              marchRecords += records2026_03.length;
            }
          }
        });
        
        console.log(`  ✅ Vehicles with March 2026 data: ${vehiclesWithMarchData}/${updatedData.length}`);
        console.log(`  📅 March 2026 records: ${marchRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 MARCH 2026 APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total March 2026 records appended: ${totalAppended}`);
    console.log(`🎉 March 2026 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending March 2026 data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendMarch2026Data();
}

module.exports = { appendMarch2026Data };
