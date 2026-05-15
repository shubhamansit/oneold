const fs = require('fs');
const path = require('path');

function appendApril2026Data() {
  try {
    console.log('ðŸ“… Appending April 2026 data to zone JSON files...');
    
    // Load April 2026 monthly data
    const aprilFile = 'monthlyData_2026_04.json';
    if (!fs.existsSync(aprilFile)) {
      console.error(`âŒ April 2026 data file not found: ${aprilFile}`);
      return false;
    }
    
    const aprilData = JSON.parse(fs.readFileSync(aprilFile, 'utf8'));
    console.log(`ðŸ“… Loaded April 2026 data: ${aprilData.length} records`);
    
    // Create a map of April vehicles for easy lookup
    const aprilVehicleMap = new Map();
    aprilData.forEach(record => {
      if (!aprilVehicleMap.has(record.Vehicle)) {
        aprilVehicleMap.set(record.Vehicle, []);
      }
      aprilVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`ðŸ“Š Total unique vehicles in April 2026 data: ${aprilVehicleMap.size}`);
    
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
      console.log(`\nðŸ”„ Processing ${zoneName}...`);
      
      try {
        // Create backup
        const backupPath = `${filePath}.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const originalContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  ðŸ’¾ Created backup: ${backupPath}`);
        
        const data = JSON.parse(originalContent);
        console.log(`  Original records: ${data.length}`);
        
        // Update each job record with April 2026 data
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
            
            // Strategy 1: Extract route code and find matching April vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find April vehicle that contains this route code
              for (const [aprilVehicle, aprilRecords] of aprilVehicleMap.entries()) {
                // Try exact route code match
                if (aprilVehicle.includes(routeCode)) {
                  console.log(`    âœ… Found match: "${jobName}" â†” "${aprilVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  aprilRecords.forEach(aprilRecord => {
                    const dateKey = aprilRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, aprilRecord);
                    totalAppended++;
                  });
                  break;
                }
                
                // Try matching with different formats
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                if (aprilVehicle.includes(last4) && aprilVehicle.includes(firstPart)) {
                  console.log(`    âœ… Found match (format variant): "${jobName}" â†” "${aprilVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  aprilRecords.forEach(aprilRecord => {
                    const dateKey = aprilRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, aprilRecord);
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
                
                for (const [aprilVehicle, aprilRecords] of aprilVehicleMap.entries()) {
                  if (aprilVehicle.includes(vehicleNum) && aprilVehicle.includes(routePrefix)) {
                    console.log(`    âœ… Found match (special format): "${jobName}" â†” "${aprilVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    aprilRecords.forEach(aprilRecord => {
                      const dateKey = aprilRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, aprilRecord);
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
              
              for (const [aprilVehicle, aprilRecords] of aprilVehicleMap.entries()) {
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedApril = aprilVehicle.replace(/[-\s]/g, '');
                
                if (aprilVehicle.includes(routeCode) || 
                    normalizedApril.includes(normalizedRoute) ||
                    aprilVehicle.includes(last4)) {
                  console.log(`    ðŸ”— Partial match: "${jobName}" â†” "${aprilVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  aprilRecords.forEach(aprilRecord => {
                    const dateKey = aprilRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, aprilRecord);
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
                
                for (const [aprilVehicle, aprilRecords] of aprilVehicleMap.entries()) {
                  if (aprilVehicle.includes(`ROUTE ${routePrefix}`) || aprilVehicle.includes(routePrefix)) {
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (aprilVehicle.includes(vehicleNum)) {
                        console.log(`    âœ… Found match (ROUTE format): "${jobName}" â†” "${aprilVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        aprilRecords.forEach(aprilRecord => {
                          const dateKey = aprilRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, aprilRecord);
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
                
                for (const [aprilVehicle, aprilRecords] of aprilVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedApril = aprilVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedApril.includes(normalizedVehicle) || 
                      aprilVehicle.includes(vehicleNumber)) {
                    console.log(`    ðŸ”— Vehicle number match: "${jobName}" â†” "${aprilVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    aprilRecords.forEach(aprilRecord => {
                      const dateKey = aprilRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, aprilRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + April 2026)
            updatedRecord.more_details = Array.from(existingDates.values());
          
          return updatedRecord;
        });
        
        // Count April 2026 records
        let aprilRecords = 0;
        let vehiclesWithaprilData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2026_04 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2026-04')
            );
            if (records2026_04.length > 0) {
              vehiclesWithaprilData++;
              aprilRecords += records2026_04.length;
            }
          }
        });
        
        console.log(`  âœ… Vehicles with April 2026 data: ${vehiclesWithaprilData}/${updatedData.length}`);
        console.log(`  ðŸ“… April 2026 records: ${aprilRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  âœ… Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  âŒ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\nðŸ“Š April 2026 APPEND SUMMARY:`);
    console.log(`âœ… Total successful mappings: ${totalMappings}`);
    console.log(`ðŸ“… Total April 2026 records appended: ${totalAppended}`);
    console.log(`ðŸŽ‰ April 2026 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('âŒ Error appending April 2026 data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendApril2026Data();
}

module.exports = { appendApril2026Data };
