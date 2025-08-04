const fs = require('fs');
const XLSX = require('xlsx');

// Function to read Excel file and extract missed checkpoint data
function readMissedCheckpointsFromExcel(excelFilePath, year, month) {
  try {
    console.log(`📊 Reading missed checkpoint data from: ${excelFilePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📅 Found ${jsonData.length} rows in Excel file`);
    
    // Read vehicle templates for mapping
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    // Create a map of vehicle names for easy lookup
    const vehicleMap = new Map();
    vehicleTemplates.forEach(template => {
      vehicleMap.set(template.Vehicle, template);
    });
    
    // Extract missed checkpoint data
    const missedCheckpointData = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Skip header row and process data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Vehicle identifier is in column 3 (index 2)
      const vehicleIdentifier = row[2];
      
      if (!vehicleIdentifier || typeof vehicleIdentifier !== 'string') {
        continue;
      }
      
      // Skip header-like entries
      if (vehicleIdentifier.toUpperCase() === 'VEHICLE' || 
          vehicleIdentifier.toUpperCase() === 'VEHICLE ID') {
        continue;
      }
      
      // Find matching vehicle template
      let matchedVehicle = null;
      const normalizedShortId = vehicleIdentifier.replace(/\s/g, '').toUpperCase();
      
      for (const [templateVehicle, template] of vehicleMap.entries()) {
        const matchStrategies = [
          templateVehicle === vehicleIdentifier,
          templateVehicle.replace(/\s/g, '') === vehicleIdentifier.replace(/\s/g, ''),
          templateVehicle.includes(vehicleIdentifier),
          templateVehicle.match(/GJ\s*\d+\s*[A-Z]+\s*\d+/)?.[0]?.replace(/\s/g, '') === normalizedShortId,
          template.Assigned && template.Assigned.includes(vehicleIdentifier)
        ];
        
        if (matchStrategies.some(strategy => strategy)) {
          matchedVehicle = templateVehicle;
          break;
        }
      }
      
      if (!matchedVehicle) {
        console.log(`⚠️  No template found for vehicle: ${vehicleIdentifier}`);
        continue;
      }
      
      // Extract missed checkpoint data for each day (columns 4 onwards)
      const dailyMissedCheckpoints = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const columnIndex = 2 + day; // Column 3 is vehicle ID, so day 1 starts at column 4 (index 3)
        
        if (columnIndex < row.length) {
          const missedValue = row[columnIndex];
          
          // Convert to number, handle null/undefined
          let missedCount = 0;
          if (missedValue !== null && missedValue !== undefined && missedValue !== '') {
            missedCount = parseInt(missedValue) || 0;
          }
          
          dailyMissedCheckpoints.push(missedCount);
        } else {
          dailyMissedCheckpoints.push(0); // Default to 0 if column doesn't exist
        }
      }
      
      missedCheckpointData[matchedVehicle] = dailyMissedCheckpoints;
      console.log(`✅ Mapped vehicle: ${vehicleIdentifier} → ${matchedVehicle} (${dailyMissedCheckpoints.filter(x => x > 0).length} days with missed checkpoints)`);
    }
    
    console.log(`📊 Successfully extracted missed checkpoint data for ${Object.keys(missedCheckpointData).length} vehicles`);
    return missedCheckpointData;
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
    return {};
  }
}

// Function to generate monthly data using actual missed checkpoint data
function generateMonthlyDataWithActualMissedCheckpoints(year, month, missedCheckpointData) {
  try {
    console.log(`🔧 Generating monthly data for ${year}-${month.toString().padStart(2, '0')}...`);
    
    // Read vehicle templates
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Array to store all monthly data
    const monthlyData = [];
    
    // Generate data for each vehicle
    vehicleTemplates.forEach(template => {
      const vehicleName = template.Vehicle;
      
      // Get missed checkpoint pattern for this vehicle
      const missedPattern = missedCheckpointData[vehicleName] || new Array(daysInMonth).fill(0);
      
      // Generate data for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        // Format date strings
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateTimeStr = `${dateStr} 23:30:00`;
        const startTimeStr = `${dateStr} 00:00:00`;
        const endTimeStr = `${dateStr} 18:00:00`;
        
        // Extract time parts from template
        const actualStartTimeParts = template["Actual Start Time"].split(' ')[1];
        const actualEndTimeParts = template["Actual End Time"].split(' ')[1];
        
        // Create actual start and end times for this day
        const actualStartTime = `${dateStr} ${actualStartTimeParts}`;
        const actualEndTime = `${dateStr} ${actualEndTimeParts}`;
        
        // Use actual missed checkpoints from Excel data
        const plannedCheckpoints = template["Planned Checkpoints"];
        const missedCheckpoints = missedPattern[day - 1] || 0;
        
        // Calculate visited checkpoints
        const visitedCheckpoints = plannedCheckpoints - missedCheckpoints;
        
        // Use actual delay values from template
        const delays = template["Delay"] || 0;
        const onTimeCheckpoints = visitedCheckpoints - delays;
        
        // Calculate completion percentage
        const completionPercentage = Math.round((visitedCheckpoints / plannedCheckpoints) * 100);
        
        // Generate random distance variations
        const estimatedDistance = template["Estimated Distance"];
        const distanceVariation = Math.random() * 0.4 + 0.8; // 80% to 120% of estimated
        const actualDistance = Math.round(estimatedDistance * distanceVariation);
        
        // Calculate distance completion percentage
        const distanceCompletedPercentage = Math.round((actualDistance / estimatedDistance) * 100);
        
        // Generate random halt time variations
        const avgHaltTime = template["avg_halt_time"];
        const [haltMinutes, haltSeconds] = avgHaltTime.split(':').map(Number);
        const totalHaltSeconds = haltMinutes * 60 + haltSeconds;
        const haltVariation = Math.random() * 0.4 + 0.8; // 80% to 120% variation
        const newHaltSeconds = Math.round(totalHaltSeconds * haltVariation);
        const newHaltMinutes = Math.floor(newHaltSeconds / 60);
        const newHaltSecs = newHaltSeconds % 60;
        const newAvgHaltTime = `${newHaltMinutes}:${newHaltSecs.toString().padStart(2, '0')}`;
        
        // Create daily record using template structure
        const dailyRecord = {
          ...template, // Copy all template properties
          "Date": dateTimeStr,
          "Start Time": startTimeStr,
          "End Time": endTimeStr,
          "Actual Start Time": actualStartTime,
          "Actual End Time": actualEndTime,
          "On-Time": onTimeCheckpoints,
          "Early": template["Early"] || 0,
          "Delay": delays,
          "Total Visited Checkpoints": visitedCheckpoints,
          "Missed Checkpoints": missedCheckpoints,
          "Checkpoints Complete Status(%)": completionPercentage,
          "Distance": actualDistance,
          "Distance Completed %": distanceCompletedPercentage,
          "avg_halt_time": newAvgHaltTime
        };
        
        monthlyData.push(dailyRecord);
      }
    });
    
    console.log(`✅ Generated ${monthlyData.length} daily records for ${vehicleTemplates.length} vehicles`);
    return monthlyData;
    
  } catch (error) {
    console.error('❌ Error generating monthly data:', error);
    return [];
  }
}

// Function to save monthly data to file
function saveMonthlyData(data, year, month) {
  try {
    const filename = `monthlyData_2025_${month.toString().padStart(2, '0')}.json`;
    const jsonContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(filename, jsonContent, 'utf8');
    
    console.log(`💾 Saved monthly data to ${filename}`);
    console.log(`📊 Total records: ${data.length}`);
    
    return filename;
    
  } catch (error) {
    console.error('❌ Error saving monthly data:', error);
    return null;
  }
}

// Main function to process Excel file and generate monthly data
function processExcelToMonthlyData(excelFilePath, year, month) {
  try {
    console.log(`🚀 Processing Excel file: ${excelFilePath}`);
    console.log(`📅 Generating data for ${year}-${month.toString().padStart(2, '0')}`);
    
    // Step 1: Read missed checkpoint data from Excel
    const missedCheckpointData = readMissedCheckpointsFromExcel(excelFilePath, year, month);
    
    if (Object.keys(missedCheckpointData).length === 0) {
      console.error('❌ No missed checkpoint data found in Excel file');
      return false;
    }
    
    // Step 2: Generate monthly data using actual missed checkpoint data
    const monthlyData = generateMonthlyDataWithActualMissedCheckpoints(year, month, missedCheckpointData);
    
    if (monthlyData.length === 0) {
      console.error('❌ Failed to generate monthly data');
      return false;
    }
    
    // Step 3: Save monthly data to file
    const savedFile = saveMonthlyData(monthlyData, year, month);
    
    if (!savedFile) {
      console.error('❌ Failed to save monthly data');
      return false;
    }
    
    console.log(`🎉 Successfully processed Excel file and generated monthly data!`);
    console.log(`📁 Output file: ${savedFile}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error processing Excel to monthly data:', error);
    return false;
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node excelToMonthlyData.js <excel_file> <year> <month>');
    console.log('Example: node excelToMonthlyData.js "JAN - 2025.xlsx" 2025 1');
    return;
  }
  
  const excelFilePath = args[0];
  const year = parseInt(args[1]);
  const month = parseInt(args[2]);
  
  if (!fs.existsSync(excelFilePath)) {
    console.error(`❌ Excel file not found: ${excelFilePath}`);
    return;
  }
  
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    console.error('❌ Invalid year or month');
    return;
  }
  
  processExcelToMonthlyData(excelFilePath, year, month);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  readMissedCheckpointsFromExcel,
  generateMonthlyDataWithActualMissedCheckpoints,
  saveMonthlyData,
  processExcelToMonthlyData
}; 