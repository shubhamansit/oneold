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
    
    // Extract missed checkpoint data and T-POI values
    const missedCheckpointData = {};
    const tpoiData = {}; // Store T-POI values by Excel vehicle ID
    const tpoiDataByTemplate = {}; // Store T-POI values by template vehicle name
    const excelVehicleToTemplate = {}; // Map Excel vehicle ID to template vehicle name
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
      const vehicleUpper = vehicleIdentifier.toUpperCase().trim();
      if (vehicleUpper === 'VEHICLE' || 
          vehicleUpper === 'VEHICLE ID' ||
          vehicleUpper.includes('TOTEL') ||
          vehicleUpper === '') {
        continue;
      }
      
      // Extract T-POI from column 4 (index 3)
      const tpoiValue = row[3];
      let tpoi = null;
      // Check if T-POI exists (including 0 as a valid value)
      if (tpoiValue !== null && tpoiValue !== undefined && tpoiValue !== '') {
        const parsedTpoi = parseInt(tpoiValue);
        if (!isNaN(parsedTpoi)) {
          tpoi = parsedTpoi;
        }
      }
      
      // Store T-POI for this Excel vehicle ID (even if no template match, and even if 0)
      if (tpoi !== null) {
        tpoiData[vehicleIdentifier.trim()] = tpoi;
      }
      
      // Find matching vehicle template
      let matchedVehicle = null;
      const normalizedShortId = vehicleIdentifier.replace(/\s/g, '').toUpperCase().trim();
      const excelVehicleNum = vehicleIdentifier.match(/\d{4}/)?.[0];
      
      for (const [templateVehicle, template] of vehicleMap.entries()) {
        const templateNormalized = templateVehicle.replace(/\s/g, '').toUpperCase();
        const templateVehicleNum = templateVehicle.match(/\d{4}/)?.[0];
        
        // Extract route code from template (format: XX-XX-XXXX)
        const routeMatch = templateVehicle.match(/(\d{2}-\d{2}-\d{4})/);
        const routeVehicleNum = routeMatch ? routeMatch[1].split('-')[2] : null;
        
        const matchStrategies = [
          templateVehicle === vehicleIdentifier.trim(),
          templateNormalized === normalizedShortId,
          templateVehicle.includes(vehicleIdentifier.trim()) || vehicleIdentifier.trim().includes(templateVehicle),
          templateVehicle.match(/GJ\s*\d+\s*[A-Z]+\s*\d+/)?.[0]?.replace(/\s/g, '').toUpperCase() === normalizedShortId,
          template.Assigned && template.Assigned.includes(vehicleIdentifier.trim()),
          // Match by vehicle number in template vehicle name
          templateVehicleNum && excelVehicleNum && templateVehicleNum === excelVehicleNum,
          // Match by vehicle number in route code (e.g., GJ06BX0435 matches route ending in 0435)
          routeVehicleNum && excelVehicleNum && routeVehicleNum === excelVehicleNum,
          // Match by partial vehicle number (last 3 digits)
          templateVehicleNum && excelVehicleNum && 
            templateVehicleNum.slice(-3) === excelVehicleNum.slice(-3) &&
            templateVehicleNum.length === excelVehicleNum.length
        ];
        
        if (matchStrategies.some(strategy => strategy)) {
          matchedVehicle = templateVehicle;
          break;
        }
      }
      
      if (!matchedVehicle) {
        console.log(`⚠️  No template found for vehicle: ${vehicleIdentifier} (T-POI: ${tpoi || 'N/A'})`);
        continue;
      }
      
      // Store T-POI value for the matched template vehicle (always store if matched and T-POI exists)
      // If multiple Excel vehicles match the same template, use the last one (or we could merge)
      if (tpoi !== null) {
        tpoiDataByTemplate[matchedVehicle] = tpoi;
      }
      excelVehicleToTemplate[vehicleIdentifier.trim()] = matchedVehicle;
      
      // Extract missed checkpoint data for each day (columns 5 onwards, since column 4 is T-POI)
      const dailyMissedCheckpoints = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const columnIndex = 3 + day; // Column 4 is T-POI, so day 1 starts at column 5 (index 4)
        
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
      
      // Store missed checkpoint data (even if all zeros)
      missedCheckpointData[matchedVehicle] = dailyMissedCheckpoints;
      console.log(`✅ Mapped vehicle: ${vehicleIdentifier} → ${matchedVehicle} (T-POI: ${tpoi || 'N/A'}, ${dailyMissedCheckpoints.filter(x => x > 0).length} days with missed checkpoints)`);
    }
    
    // Return both missed checkpoint data and T-POI data
    console.log(`📊 Successfully extracted missed checkpoint data for ${Object.keys(missedCheckpointData).length} vehicles`);
    console.log(`📊 Extracted T-POI for ${Object.keys(tpoiData).length} Excel vehicles`);
    console.log(`📊 Mapped T-POI to ${Object.keys(tpoiDataByTemplate).length} template vehicles`);
    return { missedCheckpointData, tpoiData: tpoiDataByTemplate, excelTpoiData: tpoiData };
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
    return { missedCheckpointData: {}, tpoiData: {} };
  }
}

// Function to generate monthly data using actual missed checkpoint data and T-POI values
function generateMonthlyDataWithActualMissedCheckpoints(year, month, missedCheckpointData, tpoiData = {}) {
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
        
        // Use T-POI from Excel if available, otherwise use template's Planned Checkpoints
        const plannedCheckpoints = tpoiData[vehicleName] || template["Planned Checkpoints"];
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
          "Planned Checkpoints": plannedCheckpoints, // Use T-POI from Excel
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
    
    // Step 1: Read missed checkpoint data and T-POI from Excel
    const { missedCheckpointData, tpoiData, excelTpoiData } = readMissedCheckpointsFromExcel(excelFilePath, year, month);
    
    if (Object.keys(missedCheckpointData).length === 0) {
      console.error('❌ No missed checkpoint data found in Excel file');
      return false;
    }
    
    console.log(`📊 Extracted T-POI values for ${Object.keys(tpoiData).length} template vehicles`);
    console.log(`📊 Total Excel vehicles with T-POI: ${Object.keys(excelTpoiData || {}).length}`);
    
    // Step 2: Generate monthly data using actual missed checkpoint data and T-POI values
    const monthlyData = generateMonthlyDataWithActualMissedCheckpoints(year, month, missedCheckpointData, tpoiData);
    
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