const fs = require('fs');
const path = require('path');

function appendDecemberData() {
  try {
    console.log('📅 Appending December 2025 data to zone JSON files...');
    
    // Load December monthly data
    const decemberFile = 'monthlyData_2025_12.json';
    if (!fs.existsSync(decemberFile)) {
      console.error(`❌ December data file not found: ${decemberFile}`);
      return false;
    }
    
    const decemberData = JSON.parse(fs.readFileSync(decemberFile, 'utf8'));
    console.log(`📅 Loaded December data: ${decemberData.length} records`);
    
    // Create a map of December vehicles for easy lookup
    const decemberVehicleMap = new Map();
    decemberData.forEach(record => {
      if (!decemberVehicleMap.has(record.Vehicle)) {
        decemberVehicleMap.set(record.Vehicle, []);
      }
      decemberVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`📊 Total unique vehicles in December data: ${decemberVehicleMap.size}`);
    
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
        
        // Update each job record with December data
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
            
            // Strategy 1: Extract route code and find matching December vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find December vehicle that contains this route code
              for (const [decemberVehicle, decemberRecords] of decemberVehicleMap.entries()) {
                // Try exact route code match
                if (decemberVehicle.includes(routeCode)) {
                  console.log(`    ✅ Found match: "${jobName}" ↔ "${decemberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  // Add all December records for this vehicle
                  decemberRecords.forEach(decemberRecord => {
                    const dateKey = decemberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, decemberRecord);
                    totalAppended++;
                  });
                  break; // Found the match, no need to continue
                }
                
                // Try matching with different formats
                // For "01-08-0426" match "GJ 04 GB 0426 01-08 - ENTRA"
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                // Check if December vehicle has the route parts in different order
                if (decemberVehicle.includes(last4) && decemberVehicle.includes(firstPart)) {
                  console.log(`    ✅ Found match (format variant): "${jobName}" ↔ "${decemberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  decemberRecords.forEach(decemberRecord => {
                    const dateKey = decemberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, decemberRecord);
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
                
                for (const [decemberVehicle, decemberRecords] of decemberVehicleMap.entries()) {
                  // Match vehicles like "GJ 06 BX 0386 W-1 - TRUCK" with "W-1-0386"
                  if (decemberVehicle.includes(vehicleNum) && decemberVehicle.includes(routePrefix)) {
                    console.log(`    ✅ Found match (special format): "${jobName}" ↔ "${decemberVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    decemberRecords.forEach(decemberRecord => {
                      const dateKey = decemberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, decemberRecord);
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
              
              for (const [decemberVehicle, decemberRecords] of decemberVehicleMap.entries()) {
                // Try matching with different formats
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedDecember = decemberVehicle.replace(/[-\s]/g, '');
                
                // Check if December vehicle contains the route code parts
                if (decemberVehicle.includes(routeCode) || 
                    normalizedDecember.includes(normalizedRoute) ||
                    decemberVehicle.includes(last4)) {
                  console.log(`    🔗 Partial match: "${jobName}" ↔ "${decemberVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  decemberRecords.forEach(decemberRecord => {
                    const dateKey = decemberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, decemberRecord);
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
                
                for (const [decemberVehicle, decemberRecords] of decemberVehicleMap.entries()) {
                  // Match vehicles like "GJ 04 GB 0309 ROUTE 04-10 - TRUCK" with job "04-10-0309"
                  if (decemberVehicle.includes(`ROUTE ${routePrefix}`) || decemberVehicle.includes(routePrefix)) {
                    // Also check if the vehicle number matches
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (decemberVehicle.includes(vehicleNum)) {
                        console.log(`    ✅ Found match (ROUTE format): "${jobName}" ↔ "${decemberVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        decemberRecords.forEach(decemberRecord => {
                          const dateKey = decemberRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, decemberRecord);
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
                
                for (const [decemberVehicle, decemberRecords] of decemberVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedDecember = decemberVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedDecember.includes(normalizedVehicle) || 
                      decemberVehicle.includes(vehicleNumber)) {
                    console.log(`    🔗 Vehicle number match: "${jobName}" ↔ "${decemberVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    decemberRecords.forEach(decemberRecord => {
                      const dateKey = decemberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, decemberRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + December)
            updatedRecord.more_details = Array.from(existingDates.values());
          }
          
          return updatedRecord;
        });
        
        // Count December records
        let decemberRecords = 0;
        let vehiclesWithDecemberData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_12 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-12')
            );
            if (records2025_12.length > 0) {
              vehiclesWithDecemberData++;
              decemberRecords += records2025_12.length;
            }
          }
        });
        
        console.log(`  ✅ Vehicles with December data: ${vehiclesWithDecemberData}/${updatedData.length}`);
        console.log(`  📅 December records: ${decemberRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 DECEMBER APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total December records appended: ${totalAppended}`);
    console.log(`🎉 December 2025 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending December data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendDecemberData();
}

module.exports = { appendDecemberData };
