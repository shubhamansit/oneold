const fs = require('fs');
const path = require('path');

// Function to read and parse the existing index.ts file
function readIndexFile() {
  try {
    const indexPath = path.join(__dirname, 'data', 'index.ts');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    console.log(`📁 Read index.ts file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Extract all data arrays from the file dynamically
    const arrays = {};
    const exportMatches = content.matchAll(/export\s+const\s+([a-zA-Z_]+)\s*=\s*(\[.*?\]);/gs);
    
    for (const match of exportMatches) {
      const arrayName = match[1];
      const arrayContent = match[2];
      
      try {
        const data = eval(`(${arrayContent})`);
        arrays[arrayName] = { data, match: match[0] };
        console.log(`📊 Found ${data.length} records in ${arrayName}`);
      } catch (error) {
        console.log(`⚠️  Error parsing ${arrayName}: ${error.message}`);
      }
    }
    
    if (Object.keys(arrays).length === 0) {
      throw new Error('Could not find any data exports in index.ts');
    }
    
    return { content, arrays };
    
  } catch (error) {
    console.error('Error reading index.ts:', error);
    return null;
  }
}

// Function to group monthly data by vehicle
function groupMonthlyDataByVehicle(monthlyData) {
  const grouped = {};
  
  monthlyData.forEach(record => {
    const vehicle = record.Vehicle;
    if (!grouped[vehicle]) {
      grouped[vehicle] = [];
    }
    grouped[vehicle].push(record);
  });
  
  console.log(`🚗 Grouped monthly data for ${Object.keys(grouped).length} vehicles`);
  return grouped;
}

// Function to find existing vehicle data and append monthly data to all arrays
function appendMonthlyDataToAllArrays(arrays, monthlyDataGrouped) {
  const updatedArrays = {};
  
  Object.entries(arrays).forEach(([arrayName, arrayInfo]) => {
    console.log(`\n🔄 Processing array: ${arrayName}`);
    const updatedData = appendMonthlyDataToIndex(arrayInfo.data, monthlyDataGrouped);
    updatedArrays[arrayName] = {
      ...arrayInfo,
      data: updatedData
    };
  });
  
  return updatedArrays;
}

// Function to find existing vehicle data and append monthly data
function appendMonthlyDataToIndex(existingData, monthlyDataGrouped) {
  const updatedData = [...existingData]; // Copy existing data
  
  // Create a map for faster lookup
  const vehicleMap = new Map();
  existingData.forEach((item, index) => {
    if (item.Vehicle) {
      vehicleMap.set(item.Vehicle, index);
    }
  });
  
  let appendedCount = 0;
  let newVehiclesCount = 0;
  
  // Process each vehicle's monthly data
  Object.entries(monthlyDataGrouped).forEach(([vehicle, monthlyRecords]) => {
    const existingIndex = vehicleMap.get(vehicle);
    
    if (existingIndex !== undefined) {
      // Vehicle exists, append monthly data to more_details
      const existingRecord = updatedData[existingIndex];
      
      if (!existingRecord.more_details) {
        existingRecord.more_details = [];
      }
      
      // Add all monthly records to more_details
      existingRecord.more_details.push(...monthlyRecords);
      appendedCount += monthlyRecords.length;
      
      console.log(`✅ Appended ${monthlyRecords.length} records to existing vehicle: ${vehicle}`);
    } else {
      // New vehicle, create new record with proper structure
      const newRecord = {
        Branch: "--",
        Town: "--", 
        Zone: "--",
        Ward: "--",
        "Job Name": vehicle,
        "Job Type": "--",
        "Total Jobs": 0,
        Completed: 0,
        "Completed With Issue": 0,
        Failed: 0,
        Penalty: 0,
        "Assigned Helpers": "--",
        Incidents: 0,
        more_details: monthlyRecords
      };
      updatedData.push(newRecord);
      newVehiclesCount += monthlyRecords.length;
      
      console.log(`🆕 Added new vehicle with ${monthlyRecords.length} records: ${vehicle}`);
    }
  });
  
  console.log(`📈 Summary for this array:`);
  console.log(`- Appended ${appendedCount} records to existing vehicles`);
  console.log(`- Added ${newVehiclesCount} records for new vehicles`);
  console.log(`- Total records in updated data: ${updatedData.length}`);
  
  return updatedData;
}

// Function to write updated data back to index.ts
function writeUpdatedIndexFile(originalContent, updatedArrays) {
  try {
    const indexPath = path.join(__dirname, 'data', 'index.ts');
    
    // Create backup
    const backupPath = path.join(__dirname, 'data', `index_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ts`);
    fs.writeFileSync(backupPath, originalContent);
    console.log(`💾 Created backup: ${path.basename(backupPath)}`);
    
    // Replace all arrays in the original content
    let updatedContent = originalContent;
    
    Object.entries(updatedArrays).forEach(([arrayName, arrayInfo]) => {
      const newExport = `export const ${arrayName} = ${JSON.stringify(arrayInfo.data, null, 2)};`;
      updatedContent = updatedContent.replace(arrayInfo.match, newExport);
      console.log(`✅ Updated ${arrayName} array`);
    });
    
    // Write updated content
    fs.writeFileSync(indexPath, updatedContent);
    console.log(`✅ Updated index.ts with monthly data for all arrays`);
    
    return true;
  } catch (error) {
    console.error('Error writing updated index.ts:', error);
    return false;
  }
}

// Function to append monthly data to index.ts
function appendMonthlyDataToIndexFile(monthlyDataFile) {
  try {
    console.log('🔄 Starting monthly data append process...');
    
    // Read monthly data
    if (!fs.existsSync(monthlyDataFile)) {
      console.error(`❌ Monthly data file not found: ${monthlyDataFile}`);
      return false;
    }
    
    const monthlyDataContent = fs.readFileSync(monthlyDataFile, 'utf8');
    const monthlyData = JSON.parse(monthlyDataContent);
    console.log(`📊 Loaded ${monthlyData.length} monthly records from ${monthlyDataFile}`);
    
    // Read existing index.ts
    const indexResult = readIndexFile();
    if (!indexResult) {
      return false;
    }
    
    const { content: originalContent, arrays } = indexResult;
    
    // Group monthly data by vehicle
    const monthlyDataGrouped = groupMonthlyDataByVehicle(monthlyData);
    
    // Append monthly data to all arrays
    const updatedArrays = appendMonthlyDataToAllArrays(arrays, monthlyDataGrouped);
    
    // Write updated data back to index.ts
    const success = writeUpdatedIndexFile(originalContent, updatedArrays);
    
    if (success) {
      console.log('🎉 Successfully appended monthly data to index.ts!');
      return true;
    } else {
      console.error('❌ Failed to update index.ts');
      return false;
    }
    
  } catch (error) {
    console.error('Error in append process:', error);
    return false;
  }
}

// Main function
function main() {
  const monthlyDataFile = 'monthlyData_2025_01.json';
  
  console.log('📋 Monthly Data Append Tool');
  console.log(`📁 Target file: ${monthlyDataFile}`);
  
  const success = appendMonthlyDataToIndexFile(monthlyDataFile);
  
  if (success) {
    console.log('\n✅ Process completed successfully!');
    console.log('💡 Your index.ts file now contains the January 2025 data for all vehicles.');
  } else {
    console.log('\n❌ Process failed. Check the error messages above.');
  }
}

// Export functions for use in other modules
module.exports = {
  appendMonthlyDataToIndexFile,
  readIndexFile,
  groupMonthlyDataByVehicle,
  appendMonthlyDataToIndex,
  writeUpdatedIndexFile
};

// Run the script if called directly
if (require.main === module) {
  main();
} 