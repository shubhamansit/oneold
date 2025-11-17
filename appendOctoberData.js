const fs = require('fs');
const path = require('path');

function appendOctoberData() {
  try {
    console.log('📅 Appending October 2025 data to zone JSON files...');
    
    // Load October monthly data
    const octoberFile = 'monthlyData_2025_10.json';
    if (!fs.existsSync(octoberFile)) {
      console.error(`❌ October data file not found: ${octoberFile}`);
      return false;
    }
    
    const octoberData = JSON.parse(fs.readFileSync(octoberFile, 'utf8'));
    console.log(`📅 Loaded October data: ${octoberData.length} records`);
    
    // Create a map of October vehicles for easy lookup
    const octoberVehicleMap = new Map();
    octoberData.forEach(record => {
      if (!octoberVehicleMap.has(record.Vehicle)) {
        octoberVehicleMap.set(record.Vehicle, []);
      }
      octoberVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`📊 Total unique vehicles in October data: ${octoberVehicleMap.size}`);
    
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
        
        // Update each job record with October data
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
            
            // Strategy 1: Extract route code and find matching October vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find October vehicle that contains this route code
              for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
                // Try exact route code match
                if (octoberVehicle.includes(routeCode)) {
                  console.log(`    ✅ Found match: "${jobName}" ↔ "${octoberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  // Add all October records for this vehicle
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, octoberRecord);
                    totalAppended++;
                  });
                  break; // Found the match, no need to continue
                }
                
                // Try matching with different formats
                // For "01-08-0426" match "GJ 04 GB 0426 01-08 - ENTRA"
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                // Check if October vehicle has the route parts in different order
                if (octoberVehicle.includes(last4) && octoberVehicle.includes(firstPart)) {
                  console.log(`    ✅ Found match (format variant): "${jobName}" ↔ "${octoberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, octoberRecord);
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
                
                for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
                  // Match vehicles like "GJ 06 BX 0386 W-1 - TRUCK" with "W-1-0386"
                  if (octoberVehicle.includes(vehicleNum) && octoberVehicle.includes(routePrefix)) {
                    console.log(`    ✅ Found match (special format): "${jobName}" ↔ "${octoberVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    octoberRecords.forEach(octoberRecord => {
                      const dateKey = octoberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, octoberRecord);
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
              
              for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
                // Try matching with different formats
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedOctober = octoberVehicle.replace(/[-\s]/g, '');
                
                // Check if October vehicle contains the route code parts
                if (octoberVehicle.includes(routeCode) || 
                    normalizedOctober.includes(normalizedRoute) ||
                    octoberVehicle.includes(last4)) {
                  console.log(`    🔗 Partial match: "${jobName}" ↔ "${octoberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, octoberRecord);
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
                
                for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
                  // Match vehicles like "GJ 04 GB 0309 ROUTE 04-10 - TRUCK" with job "04-10-0309"
                  if (octoberVehicle.includes(`ROUTE ${routePrefix}`) || octoberVehicle.includes(routePrefix)) {
                    // Also check if the vehicle number matches
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (octoberVehicle.includes(vehicleNum)) {
                        console.log(`    ✅ Found match (ROUTE format): "${jobName}" ↔ "${octoberVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        octoberRecords.forEach(octoberRecord => {
                          const dateKey = octoberRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, octoberRecord);
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
                
                for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedOctober = octoberVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedOctober.includes(normalizedVehicle) || 
                      octoberVehicle.includes(vehicleNumber)) {
                    console.log(`    🔗 Vehicle number match: "${jobName}" ↔ "${octoberVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    octoberRecords.forEach(octoberRecord => {
                      const dateKey = octoberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, octoberRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + October)
            updatedRecord.more_details = Array.from(existingDates.values());
          }
          
          return updatedRecord;
        });
        
        // Count October records
        let octoberRecords = 0;
        let vehiclesWithOctoberData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            if (records2025_10.length > 0) {
              vehiclesWithOctoberData++;
              octoberRecords += records2025_10.length;
            }
          }
        });
        
        console.log(`  ✅ Vehicles with October data: ${vehiclesWithOctoberData}/${updatedData.length}`);
        console.log(`  📅 October records: ${octoberRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 OCTOBER APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total October records appended: ${totalAppended}`);
    console.log(`🎉 October 2025 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending October data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendOctoberData();
}

module.exports = { appendOctoberData };

