const fs = require('fs');
const XLSX = require('xlsx');

// Function to generate monthly data for a single vehicle
function generateMonthlyDataForVehicle(template, month, year, missedMilestones) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthData = [];

  // Extract time parts from template
  const startTimeParts = template["Actual Start Time"].split(' ')[1];
  const endTimeParts = template["Actual End Time"].split(' ')[1];

  for (let day = 1; day <= daysInMonth; day++) {
    const missedCheckpoints = missedMilestones[day] || 0;
    const plannedCheckpoints = template["Planned Checkpoints"];
    const onTime = plannedCheckpoints - missedCheckpoints;
    const totalVisited = onTime;
    const completionPercentage = plannedCheckpoints > 0 ? Math.round((totalVisited / plannedCheckpoints) * 100) : 0;

    // Format date strings
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const startTimeStr = `${dateStr} 00:00:00`;
    const endTimeStr = `${dateStr} 18:00:00`;
    const actualStartTimeStr = `${dateStr} ${startTimeParts}`;
    const actualEndTimeStr = `${dateStr} ${endTimeParts}`;
    const reportDateStr = `${dateStr} 23:30:00`;

    const dayData = {
      ...template,
      Date: reportDateStr,
      "Start Time": startTimeStr,
      "End Time": endTimeStr,
      "Actual Start Time": actualStartTimeStr,
      "Actual End Time": actualEndTimeStr,
      "On-Time": onTime,
      "Total Visited Checkpoints": totalVisited,
      "Missed Checkpoints": missedCheckpoints,
      "Checkpoints Complete Status(%)": completionPercentage,
    };

    monthData.push(dayData);
  }

  return monthData;
}

// Function to load vehicle templates
function loadVehicleTemplates() {
  try {
    const templateData = fs.readFileSync('./vehicleTemplates.json', 'utf8');
    // Parse the comma-separated JSON objects
    const templates = [];
    const lines = templateData.trim().split('\n');
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const template = JSON.parse(line.trim().replace(/,$/, ''));
          templates.push(template);
        } catch (e) {
          // Skip invalid lines
        }
      }
    });
    
    console.log(`Loaded ${templates.length} vehicle templates`);
    return templates;
  } catch (error) {
    console.error('Error loading vehicle templates:', error.message);
    return [];
  }
}

// Function to process Excel data and generate monthly data
function processExcelData(excelFilePath, month, year) {
  try {
    // Load vehicle templates
    const templates = loadVehicleTemplates();
    if (templates.length === 0) {
      console.log('No templates found. Please run extractVehicleTemplates.js first.');
      return [];
    }

    // Read Excel file
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Processing ${data.length} rows from Excel...`);

    let allGeneratedData = [];
    let processedVehicles = 0;

    data.forEach((row, index) => {
      const route = row['RUTE'];
      const vehicle = row['VEHICLE'];
      
      if (!route || !vehicle) {
        console.log(`Skipping row ${index + 1}: Missing route or vehicle`);
        return;
      }

      // Find matching template
      const template = templates.find(t => {
        const templateVehicle = t.Vehicle;
        return templateVehicle.includes(vehicle) || templateVehicle.includes(route);
      });

      if (!template) {
        console.log(`No template found for vehicle: ${vehicle} (${route})`);
        return;
      }

      // Extract missed milestones from columns 1-31
      const missedMilestones = {};
      for (let day = 1; day <= 31; day++) {
        const value = row[day.toString()];
        if (value && value > 0) {
          missedMilestones[day] = parseInt(value);
        }
      }

      // Generate data for this vehicle
      const vehicleData = generateMonthlyDataForVehicle(template, month, year, missedMilestones);
      
      // Add to all data
      allGeneratedData = allGeneratedData.concat(vehicleData);
      processedVehicles++;
      
      console.log(`Generated data for ${vehicle} (${route}) - ${Object.keys(missedMilestones).length} days with missed checkpoints`);
    });

    console.log(`\nProcessed ${processedVehicles} vehicles`);
    return allGeneratedData;

  } catch (error) {
    console.error('Error processing Excel file:', error.message);
    return [];
  }
}

// Function to save generated data
function saveGeneratedData(allData, month, year) {
  if (allData.length === 0) {
    console.log('No data to save');
    return;
  }

  console.log(`\nGenerated ${allData.length} total data objects`);

  // Save as comma-separated JSON objects
  const fileName = `monthlyData_${year}_${month.toString().padStart(2, '0')}.json`;
  let fileContent = '';
  allData.forEach((dayData, index) => {
    fileContent += JSON.stringify(dayData, null, 2);
    if (index < allData.length - 1) {
      fileContent += ',';
    }
    fileContent += '\n';
  });

  fs.writeFileSync(fileName, fileContent);
  console.log(`✅ Data saved to ${fileName}`);

  // Also save a sample (first 5 objects) for preview
  const sampleFileName = `sample_${year}_${month.toString().padStart(2, '0')}.json`;
  let sampleContent = '';
  allData.slice(0, 5).forEach((dayData, index) => {
    sampleContent += JSON.stringify(dayData, null, 2);
    if (index < 4) {
      sampleContent += ',';
    }
    sampleContent += '\n';
  });

  fs.writeFileSync(sampleFileName, sampleContent);
  console.log(`✅ Sample data saved to ${sampleFileName}`);

  // Show summary
  console.log(`\n📊 SUMMARY:`);
  console.log(`Total data objects: ${allData.length}`);
  console.log(`Month: ${month}/${year}`);
  console.log(`Files created: ${fileName} and ${sampleFileName}`);
}

// Main execution
function main() {
  const excelFilePath = './excel_data.xlsx'; // Change this to your Excel file path
  const month = 5; // May
  const year = 2025;

  console.log('🚀 Starting Excel data processing...');
  console.log(`📅 Generating data for ${month}/${year}`);
  
  const allData = processExcelData(excelFilePath, month, year);
  
  if (allData.length > 0) {
    saveGeneratedData(allData, month, year);
  } else {
    console.log('❌ No data generated. Please check your Excel file and templates.');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { processExcelData, generateMonthlyDataForVehicle, saveGeneratedData }; 