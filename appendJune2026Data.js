const fs = require('fs');
const path = require('path');

function appendJune2026Data() {
  try {
    console.log('ðŸ“… Appending June 2026 data to zone JSON files...');
    
    // Load June 2026 monthly data
    const JuneFile = 'monthlyData_2026_06.json';
    if (!fs.existsSync(JuneFile)) {
      console.error(`âŒ June 2026 data file not found: ${JuneFile}`);
      return false;
    }
    
    const JuneData = JSON.parse(fs.readFileSync(JuneFile, 'utf8'));
    console.log(`ðŸ“… Loaded June 2026 data: ${JuneData.length} records`);
    
    // Create a map of June vehicles for easy lookup
    const JuneVehicleMap = new Map();
    JuneData.forEach(record => {
      if (!JuneVehicleMap.has(record.Vehicle)) {
        JuneVehicleMap.set(record.Vehicle, []);
      }
      JuneVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`ðŸ“Š Total unique vehicles in June 2026 data: ${JuneVehicleMap.size}`);
    
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
        
        // Update each job record with June 2026 data
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
            
            // Strategy 1: Extract route code and find matching June vehicle
            const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find June vehicle that contains this route code
              for (const [JuneVehicle, JuneRecords] of JuneVehicleMap.entries()) {
                // Try exact route code match
                if (JuneVehicle.includes(routeCode)) {
                  console.log(`    âœ… Found match: "${jobName}" â†” "${JuneVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  JuneRecords.forEach(JuneRecord => {
                    const dateKey = JuneRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, JuneRecord);
                    totalAppended++;
                  });
                  break;
                }
                
                // Try matching with different formats
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                if (JuneVehicle.includes(last4) && JuneVehicle.includes(firstPart)) {
                  console.log(`    âœ… Found match (format variant): "${jobName}" â†” "${JuneVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  JuneRecords.forEach(JuneRecord => {
                    const dateKey = JuneRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, JuneRecord);
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
                
                for (const [JuneVehicle, JuneRecords] of JuneVehicleMap.entries()) {
                  if (JuneVehicle.includes(vehicleNum) && JuneVehicle.includes(routePrefix)) {
                    console.log(`    âœ… Found match (special format): "${jobName}" â†” "${JuneVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    JuneRecords.forEach(JuneRecord => {
                      const dateKey = JuneRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, JuneRecord);
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
              
              for (const [JuneVehicle, JuneRecords] of JuneVehicleMap.entries()) {
                const normalizedRoute = routeCode.replace(/-/g, '');
                const normalizedJune = JuneVehicle.replace(/[-\s]/g, '');
                
                if (JuneVehicle.includes(routeCode) || 
                    normalizedJune.includes(normalizedRoute) ||
                    JuneVehicle.includes(last4)) {
                  console.log(`    ðŸ”— Partial match: "${jobName}" â†” "${JuneVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  JuneRecords.forEach(JuneRecord => {
                    const dateKey = JuneRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, JuneRecord);
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
                
                for (const [JuneVehicle, JuneRecords] of JuneVehicleMap.entries()) {
                  if (JuneVehicle.includes(`ROUTE ${routePrefix}`) || JuneVehicle.includes(routePrefix)) {
                    const vehicleNumMatch = jobName.match(/(\d{4})/);
                    if (vehicleNumMatch) {
                      const vehicleNum = vehicleNumMatch[1];
                      if (JuneVehicle.includes(vehicleNum)) {
                        console.log(`    âœ… Found match (ROUTE format): "${jobName}" â†” "${JuneVehicle}"`);
                        foundMatch = true;
                        totalMappings++;
                        
                        JuneRecords.forEach(JuneRecord => {
                          const dateKey = JuneRecord.Date.split(' ')[0];
                          existingDates.set(dateKey, JuneRecord);
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
                
                for (const [JuneVehicle, JuneRecords] of JuneVehicleMap.entries()) {
                  const normalizedVehicle = vehicleNumber.replace(/-/g, '');
                  const normalizedJune = JuneVehicle.replace(/[-\s]/g, '');
                  
                  if (normalizedJune.includes(normalizedVehicle) || 
                      JuneVehicle.includes(vehicleNumber)) {
                    console.log(`    ðŸ”— Vehicle number match: "${jobName}" â†” "${JuneVehicle}"`);
                    foundMatch = true;
                    totalMappings++;
                    
                    JuneRecords.forEach(JuneRecord => {
                      const dateKey = JuneRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, JuneRecord);
                      totalAppended++;
                    });
                    break;
                  }
                }
              }
            }
            
            // Update more_details with all records (existing + June 2026)
            updatedRecord.more_details = Array.from(existingDates.values());
          
          return updatedRecord;
        });
        
        // Count June 2026 records
        let JuneRecords = 0;
        let vehiclesWithJuneData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2026_06 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2026-06')
            );
            if (records2026_06.length > 0) {
              vehiclesWithJuneData++;
              JuneRecords += records2026_06.length;
            }
          }
        });
        
        console.log(`  âœ… Vehicles with June 2026 data: ${vehiclesWithJuneData}/${updatedData.length}`);
        console.log(`  ðŸ“… June 2026 records: ${JuneRecords}`);
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  âœ… Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  âŒ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\nðŸ“Š June 2026 APPEND SUMMARY:`);
    console.log(`âœ… Total successful mappings: ${totalMappings}`);
    console.log(`ðŸ“… Total June 2026 records appended: ${totalAppended}`);
    console.log(`ðŸŽ‰ June 2026 data successfully appended to zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('âŒ Error appending June 2026 data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendJune2026Data();
}

module.exports = { appendJune2026Data };
