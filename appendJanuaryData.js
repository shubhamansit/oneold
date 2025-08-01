const fs = require('fs');

function appendJanuaryData() {
  try {
    console.log('📅 Appending January 2025 data to index.ts...');
    
    // Read the index.ts file
    const indexPath = 'data/index.ts';
    const content = fs.readFileSync(indexPath, 'utf8');
    console.log(`📁 Read index.ts file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Find all array exports
    const arrayMatches = content.matchAll(/export const ([a-zA-Z_]+) = \[([\s\S]*?)\];/g);
    const arrays = {};
    
    for (const match of arrayMatches) {
      const arrayName = match[1];
      const arrayContent = match[2];
      arrays[arrayName] = { content: arrayContent, match: match[0] };
    }
    
    // Load January monthly data
    const januaryFile = 'monthlyData_2025_01.json';
    if (!fs.existsSync(januaryFile)) {
      console.error(`❌ January data file not found: ${januaryFile}`);
      return false;
    }
    
    const januaryData = JSON.parse(fs.readFileSync(januaryFile, 'utf8'));
    console.log(`📅 Loaded January data: ${januaryData.length} records`);
    
    // Create a map of January vehicles for easy lookup
    const januaryVehicleMap = new Map();
    januaryData.forEach(record => {
      if (!januaryVehicleMap.has(record.Vehicle)) {
        januaryVehicleMap.set(record.Vehicle, []);
      }
      januaryVehicleMap.get(record.Vehicle).push(record);
    });
    
    console.log(`📊 Total unique vehicles in January data: ${januaryVehicleMap.size}`);
    
    // Process all arrays
    let updatedContent = content;
    let totalMappings = 0;
    let totalAppended = 0;
    
    Object.entries(arrays).forEach(([arrayName, arrayInfo]) => {
      console.log(`\n🔄 Processing ${arrayName}...`);
      
      try {
        const data = eval(`([${arrayInfo.content}])`);
        console.log(`  Original records: ${data.length}`);
        
        // Update each vehicle with January data
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
            const arrayVehicleName = updatedRecord["Job Name"];
            let foundMatch = false;
            
            // Strategy 1: Extract route code and find matching January vehicle
            const routeMatch = arrayVehicleName.match(/(\d{2}-\d{2}-\d{4})/);
            if (routeMatch) {
              const routeCode = routeMatch[1];
              
              // Find January vehicle that contains this route code
              for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                if (januaryVehicle.includes(routeCode)) {
                  console.log(`    ✅ Found match: "${arrayVehicleName}" ↔ "${januaryVehicle}"`);
                  foundMatch = true;
                  totalMappings++;
                  
                  // Add all January records for this vehicle
                  januaryRecords.forEach(januaryRecord => {
                    const dateKey = januaryRecord.Date.split(' ')[0];
                    existingDates.set(dateKey, januaryRecord);
                    totalAppended++;
                  });
                  break; // Found the match, no need to continue
                }
              }
            }
            
            // Strategy 2: Try partial matching if no exact route match
            if (!foundMatch) {
              const vehicleNumberMatch = arrayVehicleName.match(/(\d{2}-\d{2}-\d{4})/);
              if (vehicleNumberMatch) {
                const vehicleNumber = vehicleNumberMatch[1];
                
                for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                  if (januaryVehicle.includes(vehicleNumber) || 
                      januaryVehicle.includes(vehicleNumber.replace(/-/g, '')) ||
                      januaryVehicle.includes(vehicleNumber.split('-')[2])) {
                    console.log(`    🔗 Partial match: "${arrayVehicleName}" ↔ "${januaryVehicle}"`);
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
            
            // Strategy 3: Try matching by first part of array vehicle name
            if (!foundMatch) {
              const firstPart = arrayVehicleName.split(' ')[0];
              for (const [januaryVehicle, januaryRecords] of januaryVehicleMap.entries()) {
                if (januaryVehicle.includes(firstPart)) {
                  console.log(`    🔗 First part match: "${arrayVehicleName}" ↔ "${januaryVehicle}"`);
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
            
            updatedRecord.more_details = Array.from(existingDates.values());
          }
          
          return updatedRecord;
        });
        
        // Count January records
        let januaryRecords = 0;
        let vehiclesWithJanuaryData = 0;
        updatedData.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            const records2025 = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-01')
            );
            if (records2025.length > 0) {
              vehiclesWithJanuaryData++;
              januaryRecords += records2025.length;
            }
          }
        });
        
        console.log(`  ✅ Vehicles with January data: ${vehiclesWithJanuaryData}/${updatedData.length}`);
        console.log(`  📅 January records: ${januaryRecords}`);
        
        // Replace the array in the content
        const newExport = `export const ${arrayName} = ${JSON.stringify(updatedData, null, 2)};`;
        updatedContent = updatedContent.replace(arrayInfo.match, newExport);
        console.log(`✅ Updated ${arrayName} array`);
        
      } catch (error) {
        console.error(`❌ Error processing ${arrayName}:`, error.message);
      }
    });
    
    // Create backup first
    const backupPath = `data/index_backup_before_january_append_${new Date().toISOString().replace(/[:.]/g, '-')}.ts`;
    fs.writeFileSync(backupPath, content);
    console.log(`💾 Created backup: ${backupPath}`);
    
    // Write updated file
    console.log(`📝 Writing updated file...`);
    fs.writeFileSync(indexPath, updatedContent);
    
    console.log(`\n📊 JANUARY APPEND SUMMARY:`);
    console.log(`✅ Total successful mappings: ${totalMappings}`);
    console.log(`📅 Total January records appended: ${totalAppended}`);
    console.log(`📊 New file size: ${(updatedContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🎉 January 2025 data successfully appended to index.ts!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending January data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  appendJanuaryData();
}

module.exports = { appendJanuaryData }; 