const fs = require('fs');

// Function to safely parse JavaScript object data
function parseJavaScriptData(dataString) {
  try {
    const functionBody = `return ${dataString}`;
    const parseFunction = new Function(functionBody);
    return parseFunction();
  } catch (error) {
    console.log('Failed to parse JavaScript data:', error.message);
    return null;
  }
}

// Function to extract Vehicle from nested structure
function extractVehicle(record) {
  // Try direct Vehicle field first
  if (record.Vehicle) {
    return record.Vehicle;
  }
  
  // Try nested in more_details
  if (record.more_details && record.more_details.Vehicle) {
    return record.more_details.Vehicle;
  }
  
  // Try other possible nested structures
  if (record.details && record.details.Vehicle) {
    return record.details.Vehicle;
  }
  
  if (record.data && record.data.Vehicle) {
    return record.data.Vehicle;
  }
  
  // Check all nested objects recursively
  for (const key in record) {
    if (typeof record[key] === 'object' && record[key] !== null) {
      const nestedVehicle = extractVehicle(record[key]);
      if (nestedVehicle) {
        return nestedVehicle;
      }
    }
  }
  
  return null;
}

// Function to extract template data from more_details array
function extractFromMoreDetails(record) {
  if (!record.more_details) {
    return null;
  }
  
  const moreDetails = record.more_details;
  const vehicle = extractVehicle(record);
  
  if (!vehicle) {
    return null;
  }
  
  // Get the first entry from more_details to extract constant template data
  const firstEntry = moreDetails[0] || moreDetails['0'];
  
  if (!firstEntry) {
    console.log('No first entry found in more_details');
    return null;
  }
  
  // Extract time parts from the first entry
  const actualStartTime = firstEntry["Actual Start Time"];
  const actualEndTime = firstEntry["Actual End Time"];
  
  // Extract time parts (HH:MM:SS) from the datetime strings
  const startTimeParts = actualStartTime ? actualStartTime.split(' ')[1] : "05:34:16";
  const endTimeParts = actualEndTime ? actualEndTime.split(' ')[1] : "11:20:13";
  
  // Create template with constant values (these stay the same for the vehicle)
  const template = {
    Date: "2025-01-01 23:30:00", // This will be changed for each day
    Vehicle: vehicle,
    "Start Time": "2025-01-01 00:00:00", // Date part will be changed for each day
    "End Time": "2025-01-01 18:00:00", // Date part will be changed for each day
    "Actual Start Time": `2025-01-01 ${startTimeParts}`, // Date part will be changed for each day
    "Actual End Time": `2025-01-01 ${endTimeParts}`, // Date part will be changed for each day
    "Planned Checkpoints": firstEntry["Planned Checkpoints"],
    "On-Time": firstEntry["Planned Checkpoints"], // Default to planned checkpoints
    Early: 0,
    Delay: 0,
    "Total Visited Checkpoints": firstEntry["Planned Checkpoints"], // Default to planned checkpoints
    "Missed Checkpoints": 0, // Default to 0
    "Checkpoints Complete Status(%)": 100, // Default to 100%
    "Estimated Distance": firstEntry["Estimated Distance"],
    Distance: firstEntry.Distance,
    "Distance Completed %": firstEntry["Distance Completed %"],
    "Route Distance": firstEntry["Route Distance"],
    "On Route": firstEntry["On Route"],
    "On Route %": firstEntry["On Route %"],
    "Off Route": firstEntry["Off Route"],
    "Off Route %": firstEntry["Off Route %"],
    "Early Arrival Condition(Minute)": firstEntry["Early Arrival Condition(Minute)"],
    "Delay Arrival Condition(Minute)": firstEntry["Delay Arrival Condition(Minute)"],
    "Group Name": firstEntry["Group Name"],
    Penalty: firstEntry.Penalty,
    Reason: firstEntry.Reason,
    Remark: firstEntry.Remark,
    Assigned: firstEntry.Assigned,
    Present: firstEntry.Present,
    "Waste Weight": firstEntry["Waste Weight"],
    Incidents: firstEntry.Incidents,
    avg_halt_time: firstEntry.avg_halt_time,
  };
  
  // Remove undefined values
  Object.keys(template).forEach(key => {
    if (template[key] === undefined) {
      delete template[key];
    }
  });
  
  return template;
}

// Function to extract unique vehicle templates from index.ts
function extractUniqueVehicleTemplates() {
  try {
    // Read the index.ts file
    const filePath = './data/index.ts';
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract all data arrays from the file
    const arrayMatches = fileContent.match(/export\s+const\s+\w+\s*=\s*\[([\s\S]*?)\];/g);
    
    if (!arrayMatches) {
      console.log('Could not find data arrays in index.ts');
      return [];
    }
    
    console.log(`Found ${arrayMatches.length} data arrays`);
    
    let allData = [];
    
    // Process each array
    arrayMatches.forEach((match, arrayIndex) => {
      try {
        // Extract the array name and content
        const arrayNameMatch = match.match(/export\s+const\s+(\w+)\s*=\s*\[/);
        const arrayName = arrayNameMatch ? arrayNameMatch[1] : `array${arrayIndex}`;
        
        // Extract the content between [ and ];
        const contentMatch = match.match(/\[([\s\S]*?)\];/);
        if (!contentMatch) return;
        
        const dataString = '[' + contentMatch[1] + ']';
        const data = parseJavaScriptData(dataString);
        
        if (data && Array.isArray(data)) {
          console.log(`Processing ${arrayName}: ${data.length} records`);
          allData = allData.concat(data);
        } else {
          console.log(`Failed to parse ${arrayName}`);
        }
        
      } catch (error) {
        console.log(`Error processing array ${arrayIndex}: ${error.message}`);
      }
    });
    
    console.log(`\nTotal records from all arrays: ${allData.length}`);
    
    // Create a map to store unique vehicle templates
    const uniqueTemplates = new Map();
    
    allData.forEach((record, index) => {
      if (!record || typeof record !== 'object') {
        if (index < 10) {
          console.log(`Skipping record ${index + 1}: Invalid record`);
        }
        return;
      }
      
      const vehicle = extractVehicle(record);
      
      if (!vehicle) {
        if (index < 10) { // Only show first 10 missing vehicles
          console.log(`Skipping record ${index + 1}: No vehicle found`);
        }
        return;
      }
      
      // Extract vehicle name (before "ROUTE" or similar)
      const vehicleName = vehicle.split(' ROUTE ')[0] || vehicle.split(' RUT ')[0] || vehicle;
      
      // If this vehicle doesn't exist in our map, add it
      if (!uniqueTemplates.has(vehicleName)) {
        const template = extractFromMoreDetails(record);
        if (template) {
          uniqueTemplates.set(vehicleName, template);
          console.log(`Added unique vehicle template: ${vehicleName}`);
        }
      }
    });
    
    console.log(`\nExtracted ${uniqueTemplates.size} unique vehicle templates`);
    
    return Array.from(uniqueTemplates.values());
    
  } catch (error) {
    console.error('Error reading index.ts:', error.message);
    return [];
  }
}

// Function to save unique vehicle templates to file
function saveVehicleTemplates(templates) {
  if (templates.length === 0) {
    console.log('No templates to save');
    return;
  }
  
  // Display count
  console.log(`\n📊 EXTRACTION SUMMARY:`);
  console.log(`Total unique vehicles extracted: ${templates.length}`);
  console.log(`Files created: vehicleTemplates.json and vehicleTemplates.js`);
  
  // Save as comma-separated JSON objects
  const fileName = 'vehicleTemplates.json';
  let fileContent = '';
  templates.forEach((template, index) => {
    fileContent += JSON.stringify(template, null, 2);
    if (index < templates.length - 1) {
      fileContent += ',';
    }
    fileContent += '\n';
  });
  
  fs.writeFileSync(fileName, fileContent);
  console.log(`\n✅ Saved ${templates.length} vehicle templates to ${fileName}`);
  
  // Also save as JavaScript module
  const jsFileName = 'vehicleTemplates.js';
  let jsContent = '// Vehicle templates extracted from index.ts\n';
  jsContent += '// These templates contain constant values for each vehicle\n';
  jsContent += '// Use these templates to generate daily data with varying checkpoint values\n\n';
  
  templates.forEach((template, index) => {
    const vehicleName = template.Vehicle.split(' ROUTE ')[0] || template.Vehicle.split(' RUT ')[0] || template.Vehicle;
    const cleanName = vehicleName.replace(/[^a-zA-Z0-9]/g, '_');
    jsContent += `const ${cleanName} = ${JSON.stringify(template, null, 2)};\n\n`;
  });
  
  jsContent += '// Export all templates\nmodule.exports = {\n';
  templates.forEach((template, index) => {
    const vehicleName = template.Vehicle.split(' ROUTE ')[0] || template.Vehicle.split(' RUT ')[0] || template.Vehicle;
    const cleanName = vehicleName.replace(/[^a-zA-Z0-9]/g, '_');
    jsContent += `  ${cleanName},\n`;
  });
  jsContent += '};';
  
  fs.writeFileSync(jsFileName, jsContent);
  console.log(`✅ Saved as JavaScript module to ${jsFileName}`);
  
  // Show sample of first few templates
  console.log('\n📋 Sample templates (constant values for each vehicle):');
  templates.slice(0, 3).forEach((template, index) => {
    const vehicleName = template.Vehicle.split(' ROUTE ')[0] || template.Vehicle.split(' RUT ')[0] || template.Vehicle;
    console.log(`${index + 1}. ${vehicleName}`);
    console.log(`   Planned Checkpoints: ${template["Planned Checkpoints"]} (constant)`);
    console.log(`   Estimated Distance: ${template["Estimated Distance"]} (constant)`);
    console.log(`   Distance: ${template.Distance} (constant)`);
    console.log(`   Note: Total Visited Checkpoints, Missed Checkpoints, and % will vary daily`);
    console.log('');
  });
  
  // Show final count
  console.log(`\n🎯 FINAL COUNT: ${templates.length} unique vehicle templates extracted successfully!`);
}

// Main execution
function main() {
  console.log('Extracting unique vehicle templates with constant values...');
  
  const templates = extractUniqueVehicleTemplates();
  
  if (templates.length > 0) {
    saveVehicleTemplates(templates);
  } else {
    console.log('No templates found');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { extractUniqueVehicleTemplates, saveVehicleTemplates }; 