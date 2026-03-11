const fs = require('fs');
const XLSX = require('xlsx');

function addRemaining3Vehicles() {
  try {
    console.log('📅 Adding October data for remaining 3 unmatched vehicles...\n');
    
    // The 3 unmatched vehicles with their details
    const unmatchedVehicles = [
      { excelVehicle: 'GJ04GB0182', route: '11-10-0182', tpoi: 10 },
      { excelVehicle: 'GJ06BX0306', route: '12-10-0306', tpoi: 10 },
      { excelVehicle: 'GJ04GB0482', route: '13-13-0482', tpoi: 42 }
    ];
    
    // Read Excel to get missed checkpoint data for these vehicles
    const workbook = XLSX.readFile('data/Copy of OCT 10 2025 osc.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const daysInMonth = 31;
    const year = 2025;
    const month = 10;
    
    // Extract missed checkpoint data for each vehicle
    const vehicleData = {};
    
    unmatchedVehicles.forEach(({ excelVehicle, route, tpoi }) => {
      // Find the row in Excel
      const row = jsonData.find(r => r[2] && r[2].toString().trim() === excelVehicle);
      
      if (row) {
        const missedCheckpoints = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const columnIndex = 3 + day; // Column 4 is T-POI, so day 1 starts at column 5
          const missedValue = row[columnIndex];
          let missedCount = 0;
          if (missedValue !== null && missedValue !== undefined && missedValue !== '') {
            missedCount = parseInt(missedValue) || 0;
          }
          missedCheckpoints.push(missedCount);
        }
        
        vehicleData[excelVehicle] = {
          route,
          tpoi,
          missedCheckpoints
        };
      }
    });
    
    console.log(`📊 Extracted data for ${Object.keys(vehicleData).length} vehicles\n`);
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalAdded = 0;
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\n🔄 Processing ${zoneName}...`);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let recordsUpdated = 0;
        
        const updatedData = data.map(record => {
          const updatedRecord = { ...record };
          
          if (updatedRecord.more_details && Array.isArray(updatedRecord.more_details)) {
            // Create a map of existing dates
            const existingDates = new Map();
            updatedRecord.more_details.forEach(detail => {
              if (detail.Date) {
                const dateKey = detail.Date.split(' ')[0];
                existingDates.set(dateKey, detail);
              }
            });
            
            const jobName = updatedRecord["Job Name"] || '';
            
            // Try to match each of the 3 vehicles
            for (const [excelVehicle, vehicleInfo] of Object.entries(vehicleData)) {
              const { route, tpoi, missedCheckpoints } = vehicleInfo;
              
              // Check if job name matches the route
              let foundMatch = false;
              
              // Special handling for GJ04GB0482 - check if vehicle appears anywhere in the record
              if (excelVehicle === 'GJ04GB0482') {
                const vehicleNum = '0482';
                // Check if vehicle number appears in job name
                if (jobName.includes(vehicleNum) || jobName.includes('13-13')) {
                  foundMatch = true;
                }
                // Check if vehicle appears in any detail record (case-insensitive, space-insensitive)
                else if (updatedRecord.more_details.length > 0) {
                  const normalizedExcel = excelVehicle.replace(/[-\s]/g, '').toUpperCase();
                  const hasMatch = updatedRecord.more_details.some(d => {
                    if (!d.Vehicle) return false;
                    const normalizedDetail = d.Vehicle.replace(/[-\s]/g, '').toUpperCase();
                    return normalizedDetail === normalizedExcel || 
                           normalizedDetail.includes('GJ04GB0482') ||
                           d.Vehicle.includes(vehicleNum);
                  });
                  if (hasMatch) {
                    foundMatch = true;
                    console.log(`  🔍 Found GJ04GB0482 in details of "${jobName}"`);
                  }
                }
              }
              
              // Strategy 1: Match by route code
              if (jobName.includes(route)) {
                foundMatch = true;
              }
              
              // Strategy 2: Match by vehicle number in job name or vehicle field
              if (!foundMatch) {
                const vehicleNum = excelVehicle.match(/\d{4}/)?.[0];
                if (vehicleNum && (jobName.includes(vehicleNum) || 
                    (updatedRecord.more_details.length > 0 && 
                     updatedRecord.more_details[0]?.Vehicle?.includes(vehicleNum)))) {
                  foundMatch = true;
                }
              }
              
              // Strategy 3: Match by vehicle in more_details (exact match)
              if (!foundMatch && updatedRecord.more_details.length > 0) {
                const detailVehicle = updatedRecord.more_details[0]?.Vehicle || '';
                const normalizedDetail = detailVehicle.replace(/\s/g, '').toUpperCase();
                const normalizedExcel = excelVehicle.replace(/\s/g, '').toUpperCase();
                if (normalizedDetail === normalizedExcel || 
                    detailVehicle.includes(excelVehicle) || 
                    excelVehicle.includes(detailVehicle.replace(/\s/g, ''))) {
                  foundMatch = true;
                }
              }
              
              // Strategy 4: Match by route code in job name (for 13-13-0482)
              if (!foundMatch && route.includes('13-13')) {
                if (jobName.includes('13-13') || jobName.includes('0482')) {
                  foundMatch = true;
                }
              }
              
              // Strategy 5: Match by exact vehicle number in any field
              if (!foundMatch) {
                const vehicleNum = excelVehicle.match(/\d{4}/)?.[0];
                if (vehicleNum) {
                  // Check if vehicle number appears in job name or any detail
                  if (jobName.includes(vehicleNum)) {
                    foundMatch = true;
                  } else if (updatedRecord.more_details.length > 0) {
                    // Check all detail records for this vehicle number
                    const hasVehicleNum = updatedRecord.more_details.some(d => 
                      d.Vehicle && d.Vehicle.includes(vehicleNum)
                    );
                    if (hasVehicleNum) {
                      foundMatch = true;
                    }
                  }
                }
              }
              
              if (foundMatch) {
                console.log(`  ✅ Found match: "${jobName}" ↔ ${excelVehicle} (Route: ${route}, T-POI: ${tpoi})`);
                recordsUpdated++;
                
                // Get vehicle name from existing record or use Excel vehicle
                const existingVehicle = updatedRecord.more_details[0]?.Vehicle || excelVehicle;
                
                // Generate October records
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const dateTimeStr = `${dateStr} 23:30:00`;
                  const startTimeStr = `${dateStr} 00:00:00`;
                  const endTimeStr = `${dateStr} 18:00:00`;
                  
                  const missedCount = missedCheckpoints[day - 1] || 0;
                  const visitedCheckpoints = tpoi - missedCount;
                  
                  const octoberRecord = {
                    ...updatedRecord.more_details[0], // Copy structure from existing record
                    "Date": dateTimeStr,
                    "Start Time": startTimeStr,
                    "End Time": endTimeStr,
                    "Actual Start Time": `${dateStr} 08:00:00`,
                    "Actual End Time": `${dateStr} 18:00:00`,
                    "Planned Checkpoints": tpoi,
                    "On-Time": Math.max(0, visitedCheckpoints - (updatedRecord.more_details[0]?.Delay || 0)),
                    "Early": updatedRecord.more_details[0]?.Early || 0,
                    "Delay": updatedRecord.more_details[0]?.Delay || 0,
                    "Total Visited Checkpoints": visitedCheckpoints,
                    "Missed Checkpoints": missedCount,
                    "Checkpoints Complete Status(%)": Math.round((visitedCheckpoints / tpoi) * 100),
                    "Vehicle": existingVehicle
                  };
                  
                  const dateKey = dateStr;
                  existingDates.set(dateKey, octoberRecord);
                }
                
                break; // Found match, no need to continue
              }
            }
            
            // Update more_details
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
        
        if (recordsUpdated > 0) {
          // Write updated file
          fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
          console.log(`  ✅ Updated ${recordsUpdated} job record(s)`);
          totalAdded += recordsUpdated;
        } else {
          console.log(`  ℹ️  No matches found for the 3 vehicles`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Total job records updated: ${totalAdded}`);
    console.log(`🎉 October data added for remaining 3 vehicles!`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error adding remaining vehicles:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  addRemaining3Vehicles();
}

module.exports = { addRemaining3Vehicles };

