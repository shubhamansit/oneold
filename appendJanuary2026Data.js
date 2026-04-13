const fs = require('fs');
const path = require('path');

function appendJanuary2026Data() {
  try {
    console.log('📅 Appending January 2026 data to zone JSON files...');
    
    // Load January 2026 monthly data
    const januaryFile = 'monthlyData_2026_01.json';
    if (!fs.existsSync(januaryFile)) {
      console.error(`❌ January 2026 data file not found: ${januaryFile}`);
      return false;
    }
    
    const januaryData = JSON.parse(fs.readFileSync(januaryFile, 'utf8'));
    console.log(`📅 Loaded January 2026 data: ${januaryData.length} records`);
    
    // Create a map of January vehicles for easy lookup
    const januaryVehicleMap = new Map();
    januaryData.forEach(record => {
      if (!januaryVehicleMap.has(record.Vehicle)) {
        januaryVehicleMap.set(record.Vehicle, []);
      }
      januaryVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`📊 Total unique vehicles in January 2026 data: ${januaryVehicleMap.size}`);
    
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
        
        // Update each job record with January 2026 data
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
            
            // Strategy 1: Extract route code and find matching January vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find January vehicle that contains this route code
              for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                // Try exact route code match
                if (januaryVehicle.includes(routeCode)) {
                  console.log(`    ✅ Found match: "${jobName}" ↔ "${januaryVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  januaryRecords.forEach(januaryRecord => {
                    const dateKey = januaryRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, januaryRecord);
                    totalAppended++;
                  });
                  break;
                }
                
                // Try matching with different formats
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                if (januaryVehicle.includes(last4) && januaryVehicle.includes(firstPart)) {
                  console.log(`    ✅ Found match (format variant): "${jobName}" ↔ "${januaryVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  januaryRecords.forEach(januaryRecord => {
                    const dateKey = januaryRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, januaryRecord);
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
                
                for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                  if (januaryVehicle.includes(vehicleNum) && januaryVehicle.includes(routePrefix)) {
                    console.log(`    ✅ Found match (special format): "${jobName}" ↔ "${januaryVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    januaryRecords.forEach(januaryRecord => {
                      const dateKey = januaryRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, januaryRecord);
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
              
              for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedJanuary = januaryVehicle.replace(/[-\s]/g, '');
                
                if (januaryVehicle.includes(routeCode) || 
                    normalizedJanuary.includes(normalizedRoute) ||
                    januaryVehicle.includes(last4)) {
                  console.log(`    🔗 Partial match: "${jobName}" ↔ "${januaryVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  januaryRecords.forEach(januaryRecord => {
                    const dateKey = januaryRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, januaryRecord);
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
                
                for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                  if (januaryVehicle.includes(`ROUTE ${routePrefix}`) || januaryVehicle.includes(routePrefix)) {
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (januaryVehicle.includes(vehicleNum)) {
                        console.log(`    ✅ Found match (ROUTE format): "${jobName}" ↔ "${januaryVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        januaryRecords.forEach(januaryRecord => {
                          const dateKey = januaryRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, januaryRecord);
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
                
                for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedJanuary = januaryVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedJanuary.includes(normalizedVehicle) || 
                      januaryVehicle.includes(vehicleNumber)) {
                    console.log(`    🔗 Vehicle number match: "${jobName}" ↔ "${januaryVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    januaryRecords.forEach(januaryRecord => {
                      const dateKey = januaryRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, januaryRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + January 2026)
            updatedRecord.more_details = Array.from(existingDates.values());
          
          return updatedRecord;
        });
        
        // Count January 2026 records
        let januaryRecords = 0;
        let vehiclesWithJanuaryData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2026_01 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2026-01')
            );
            if (records2026_01.length > 0) {
              vehiclesWithJanuaryData++;
              januaryRecords += records2026_01.length;
            }
          }
        });
        
        console.log(`  ✅ Vehicles with January 2026 data: ${vehiclesWithJanuaryData}/${updatedData.length}`);
        console.log(`  📅 January 2026 records: ${januaryRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 JANUARY 2026 APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total January 2026 records appended: ${totalAppended}`);
    console.log(`🎉 January 2026 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending January 2026 data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendJanuary2026Data();
}

module.exports = { appendJanuary2026Data };
