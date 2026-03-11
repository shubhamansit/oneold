const fs = require('fs');

function updateOctoberWithTPOI() {
  try {
    console.log('🔄 Updating October 2025 data with correct T-POI values in zone files...\n');
    
    // Load the updated October monthly data with T-POI
    const octoberFile = 'monthlyData_2025_10.json';
    if (!fs.existsSync(octoberFile)) {
      console.error(`❌ October data file not found: ${octoberFile}`);
      console.error('   Please run: node excelToMonthlyData.js "data/Copy of OCT 10 2025 osc.xlsx" 2025 10');
      return false;
    }
    
    const octoberData = JSON.parse(fs.readFileSync(octoberFile, 'utf8'));
    console.log(`📅 Loaded October data: ${octoberData.length} records`);
    
    // Create a map of October vehicles
    const octoberVehicleMap = new Map();
    octoberData.forEach(record => {
      const vehicle = record.Vehicle;
      if (!octoberVehicleMap.has(vehicle)) {
        octoberVehicleMap.set(vehicle, []);
      }
      octoberVehicleMap.get(vehicle).push(record);
    });
    
    console.log(`📊 Unique vehicles in October data: ${octoberVehicleMap.size}\n`);
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalUpdated = 0;
    let totalRemoved = 0;
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\n🔄 Processing ${zoneName}...`);
      
      try {
        // Create backup
        const backupPath = `${filePath}.backup.before_tpoi_update_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const originalContent = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(backupPath, originalContent);
        console.log(`  💾 Created backup: ${backupPath}`);
        
        const data = JSON.parse(originalContent);
        console.log(`  Original records: ${data.length}`);
        
        let recordsUpdated = 0;
        let recordsRemoved = 0;
        
        // Update each job record
        const updatedData = data.map(record => {
          const updatedRecord = { ...record };
          
          // Check if this is a placeholder
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
            // Remove all October 2025 records
            const nonOctoberRecords = updatedRecord.more_details.filter(detail => 
              !detail.Date || !detail.Date.startsWith('2025-10')
            );
            recordsRemoved += updatedRecord.more_details.length - nonOctoberRecords.length;
            
            // Create a map of existing dates to avoid duplicates
            const existingDates = new Map();
            nonOctoberRecords.forEach(detail => {
              if (detail.Date) {
                const dateKey = detail.Date.split(' ')[0];
                existingDates.set(dateKey, detail);
              }
            });
            
            const jobName = updatedRecord["Job Name"] || '';
            let foundMatch = false;
            
            // Try to match with October vehicles
            for (const [octoberVehicle, octoberRecords] of octoberVehicleMap.entries()) {
              // Strategy 1: Extract route code and find matching October vehicle
              const routeMatch = jobName.match(/(\d{2}-\d{2}-\d{4})/);
              if (routeMatch) {
                const routeCode = routeMatch[1];
                
                // Check if October vehicle contains this route code
                if (octoberVehicle.includes(routeCode)) {
                  foundMatch = true;
                  recordsUpdated++;
                  
                  // Add all October records for this vehicle
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, octoberRecord);
                  });
                  break;
                }
                
                // Try format variants
                const routeParts = routeCode.split('-');
                const last4 = routeParts[2];
                const firstPart = `${routeParts[0]}-${routeParts[1]}`;
                
                if (octoberVehicle.includes(last4) && octoberVehicle.includes(firstPart)) {
                  foundMatch = true;
                  recordsUpdated++;
                  
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, octoberRecord);
                  });
                  break;
                }
              }
              
              // Strategy 2: Handle special route formats (W-1-0386, E-1-0309, etc.)
              if (!foundMatch) {
                const specialRouteMatch = jobName.match(/([WE]-\d+-\d{4})/);
                if (specialRouteMatch) {
                  const specialRoute = specialRouteMatch[1];
                  const routeParts = specialRoute.split('-');
                  const vehicleNum = routeParts[2];
                  const routePrefix = `${routeParts[0]}-${routeParts[1]}`;
                  
                  if (octoberVehicle.includes(vehicleNum) && octoberVehicle.includes(routePrefix)) {
                    foundMatch = true;
                    recordsUpdated++;
                    
                    octoberRecords.forEach(octoberRecord => {
                      const dateKey = octoberRecord.Date.split(' ')[0];
                      existingDates.set(dateKey, octoberRecord);
                    });
                    break;
                  }
                }
              }
              
              // Strategy 3: Handle "ROUTE XX-XX" format
              if (!foundMatch) {
                const routeFormatMatch = jobName.match(/ROUTE\s+(\d{2}-\d{2})/);
                if (routeFormatMatch) {
                  const routePrefix = routeFormatMatch[1];
                  const vehicleNumMatch = jobName.match(/(\d{4})/);
                  
                  if (vehicleNumMatch) {
                    const vehicleNum = vehicleNumMatch[1];
                    if ((octoberVehicle.includes(`ROUTE ${routePrefix}`) || octoberVehicle.includes(routePrefix)) &&
                        octoberVehicle.includes(vehicleNum)) {
                      foundMatch = true;
                      recordsUpdated++;
                      
                      octoberRecords.forEach(octoberRecord => {
                        const dateKey = octoberRecord.Date.split(' ')[0];
                        existingDates.set(dateKey, octoberRecord);
                      });
                      break;
                    }
                  }
                }
              }
              
              // Strategy 4: Match by vehicle name in more_details
              if (!foundMatch && updatedRecord.more_details.length > 0) {
                const firstDetail = updatedRecord.more_details[0];
                const detailVehicle = firstDetail?.Vehicle || '';
                
                // Normalize vehicle names for comparison
                const normalizedOctober = octoberVehicle.replace(/[-\s]/g, '').toUpperCase();
                const normalizedDetail = detailVehicle.replace(/[-\s]/g, '').toUpperCase();
                
                if (normalizedOctober === normalizedDetail || 
                    normalizedOctober.includes(normalizedDetail) ||
                    normalizedDetail.includes(normalizedOctober)) {
                  foundMatch = true;
                  recordsUpdated++;
                  
                  octoberRecords.forEach(octoberRecord => {
                    const dateKey = octoberRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, octoberRecord);
                  });
                  break;
                }
              }
              
              if (foundMatch) break;
            }
            
            // Update more_details with all records (existing + new October)
            updatedRecord.more_details = Array.from(existingDates.values());
            
            // Sort by date
            updatedRecord.more_details.sort((a, b) => {
              const dateA = new Date(a.Date || 0);
              const dateB = new Date(b.Date || 0);
              return dateA - dateB;
            });
          }
          
          return updatedRecord;
        });
        
        // Count October records
        let octoberRecords = 0;
        let vehiclesWithOctober = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025_10 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            if (records2025_10.length > 0) {
              vehiclesWithOctober++;
              octoberRecords += records2025_10.length;
            }
          }
        });
        
        console.log(`  🗑️  Removed old October records: ${recordsRemoved}`);
        console.log(`  ✅ Updated job records: ${recordsUpdated}`);
        console.log(`  📅 Vehicles with October data: ${vehiclesWithOctober}`);
        console.log(`  📅 Total October records: ${octoberRecords}`);
        
        totalUpdated += recordsUpdated;
        totalRemoved += recordsRemoved;
        
        // Write updated file
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log(`  ✅ Updated ${zoneName} file`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 UPDATE SUMMARY:`);
    console.log(`🗑️  Total old October records removed: ${totalRemoved}`);
    console.log(`✅ Total job records updated: ${totalUpdated}`);
    console.log(`🎉 October 2025 data successfully updated with T-POI values in all zone files!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error updating October data with T-POI:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  updateOctoberWithTPOI();
}

module.exports = { updateOctoberWithTPOI };

