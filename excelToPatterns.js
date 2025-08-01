const fs = require('fs');
const XLSX = require('xlsx');

// Function to find matching vehicle template by short identifier
function findMatchingVehicleTemplate(shortIdentifier, vehicleTemplates) {
  // Convert to string and handle null/undefined
  if (!shortIdentifier || typeof shortIdentifier !== 'string') {
    return null;
  }
  
  // Skip header rows
  if (shortIdentifier.toUpperCase() === 'VEHICLE' || shortIdentifier.toUpperCase() === 'VEHICLE ID') {
    return null;
  }
  
  // Remove spaces and convert to uppercase for comparison
  const normalizedShortId = shortIdentifier.replace(/\s/g, '').toUpperCase();
  
  for (const template of vehicleTemplates) {
    const templateVehicle = template.Vehicle;
    
    // Try different matching strategies
    const matchStrategies = [
      // Exact match
      templateVehicle === shortIdentifier,
      
      // Match by removing spaces and comparing
      templateVehicle.replace(/\s/g, '') === shortIdentifier.replace(/\s/g, ''),
      
      // Match by extracting the vehicle number part
      templateVehicle.includes(shortIdentifier),
      
      // Match by extracting GJ + number pattern
      templateVehicle.match(/GJ\s*\d+\s*[A-Z]+\s*\d+/)?.[0]?.replace(/\s/g, '') === shortIdentifier.replace(/\s/g, ''),
      
      // Match by assigned field (some templates have short IDs in assigned field)
      template.Assigned && template.Assigned.includes(shortIdentifier)
    ];
    
    if (matchStrategies.some(strategy => strategy)) {
      return template;
    }
  }
  
  return null;
}

// Function to read Excel file and extract missed checkpoint patterns
function readExcelToPatterns(excelFilePath, sheetName = null) {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    // Get the first sheet if no specific sheet is provided
    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert sheet to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`📊 Read ${jsonData.length} rows from Excel file`);
    
    // Load vehicle templates for matching
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    console.log(`📋 Loaded ${vehicleTemplates.length} vehicle templates`);
    
    // Extract vehicle names and missed checkpoint patterns
    const patterns = {};
    const unmatchedVehicles = [];
    
    // Skip header row if it exists, start from row 1
    const dataRows = jsonData.slice(1);
    
    dataRows.forEach((row, index) => {
      if (row.length < 4) {
        console.log(`⚠️  Skipping row ${index + 1}: insufficient data`);
        return;
      }
      
      // Column 3 (index 2) contains vehicle identifier
      const vehicleIdentifier = row[2];
      
      // Skip if no vehicle identifier or if it's a header
      if (!vehicleIdentifier || typeof vehicleIdentifier !== 'string') {
        console.log(`⚠️  Skipping row ${index + 1}: invalid vehicle identifier`);
        return;
      }
      
      // Skip header rows
      if (vehicleIdentifier.toUpperCase() === 'VEHICLE' || vehicleIdentifier.toUpperCase() === 'VEHICLE ID') {
        console.log(`⚠️  Skipping header row ${index + 1}`);
        return;
      }
      
      // Find matching vehicle template
      const matchingTemplate = findMatchingVehicleTemplate(vehicleIdentifier, vehicleTemplates);
      
      if (!matchingTemplate) {
        unmatchedVehicles.push(vehicleIdentifier);
        console.log(`❌ No template found for vehicle: ${vehicleIdentifier}`);
        return;
      }
      
      // Extract daily missed milestones data (columns 4 onwards, excluding the last total column)
      const dailyData = row.slice(3, -1); // Skip the last column (total)
      
      if (dailyData.length === 0) {
        console.log(`⚠️  Skipping row ${index + 1}: no daily data`);
        return;
      }
      
      // Convert to numbers and ensure we have 31 days of data
      const missedMilestones = dailyData.map(value => parseInt(value) || 0);
      
      // Pad or truncate to exactly 31 days
      while (missedMilestones.length < 31) {
        missedMilestones.push(0);
      }
      
      if (missedMilestones.length > 31) {
        missedMilestones.splice(31);
      }
      
      // Store the pattern using the full vehicle name from template
      patterns[matchingTemplate.Vehicle] = missedMilestones;
      
      console.log(`✅ Matched: ${vehicleIdentifier} → ${matchingTemplate.Vehicle} (${missedMilestones.length} days)`);
    });
    
    console.log(`🚗 Found patterns for ${Object.keys(patterns).length} vehicles`);
    
    if (unmatchedVehicles.length > 0) {
      console.log(`⚠️  Unmatched vehicles (${unmatchedVehicles.length}):`);
      unmatchedVehicles.forEach(vehicle => console.log(`   - ${vehicle}`));
    }
    
    return patterns;
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return {};
  }
}

// Function to save patterns to JSON file
function savePatternsToFile(patterns, filename = 'missedCheckpointPatterns.json') {
  try {
    fs.writeFileSync(filename, JSON.stringify(patterns, null, 2));
    console.log(`✅ Patterns saved to ${filename}`);
    return filename;
  } catch (error) {
    console.error('Error saving patterns:', error);
    return null;
  }
}

// Function to load patterns from JSON file
function loadPatternsFromFile(filename = 'missedCheckpointPatterns.json') {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading patterns:', error);
    return {};
  }
}

// Function to create sample patterns for testing
function createSamplePatterns() {
  const samplePatterns = {
    "GJ 04 GB 0480 RUT 03-08-0480 - Default": [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "GJ 06 BX 0137 RUT 01-04-0137 - TRUCK": [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "GJ 04 GA 0675 RUT 09-07-0675 - ROUTE 09-07": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Add more vehicles as needed
  };
  
  return samplePatterns;
}

// Function to validate patterns against vehicle templates
function validatePatterns(patterns, vehicleTemplatesFile = 'vehicleTemplates.json') {
  try {
    const vehicleTemplatesData = fs.readFileSync(vehicleTemplatesFile, 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    const templateVehicles = vehicleTemplates.map(template => template.Vehicle);
    const patternVehicles = Object.keys(patterns);
    
    console.log(`\n🔍 Pattern Validation:`);
    console.log(`- Vehicles in templates: ${templateVehicles.length}`);
    console.log(`- Vehicles in patterns: ${patternVehicles.length}`);
    
    // Since we now match vehicles during processing, all pattern vehicles should be in templates
    const missingInTemplates = patternVehicles.filter(vehicle => !templateVehicles.includes(vehicle));
    if (missingInTemplates.length > 0) {
      console.log(`⚠️  Vehicles in patterns but not in templates: ${missingInTemplates.length}`);
      missingInTemplates.forEach(vehicle => console.log(`   - ${vehicle}`));
    }
    
    // Find vehicles in templates but not in patterns
    const missingInPatterns = templateVehicles.filter(vehicle => !patternVehicles.includes(vehicle));
    if (missingInPatterns.length > 0) {
      console.log(`⚠️  Vehicles in templates but not in patterns: ${missingInPatterns.length}`);
      console.log(`   (These will use random patterns)`);
    }
    
    // Validate pattern lengths
    patternVehicles.forEach(vehicle => {
      const pattern = patterns[vehicle];
      if (pattern.length !== 31) {
        console.log(`⚠️  Pattern for ${vehicle} has ${pattern.length} days (should be 31)`);
      }
    });
    
    return {
      valid: missingInTemplates.length === 0,
      missingInTemplates,
      missingInPatterns
    };
    
  } catch (error) {
    console.error('Error validating patterns:', error);
    return { valid: false, missingInTemplates: [], missingInPatterns: [] };
  }
}

// Main function to process Excel file
function main() {
  console.log('📊 Excel to Patterns Converter');
  
  // Check if Excel file path is provided as command line argument
  const excelFilePath = process.argv[2];
  
  if (!excelFilePath) {
    console.log('❌ Please provide Excel file path as argument');
    console.log('Usage: node excelToPatterns.js <excel-file-path>');
    console.log('\n📋 Example:');
    console.log('node excelToPatterns.js missed_checkpoints.xlsx');
    return;
  }
  
  if (!fs.existsSync(excelFilePath)) {
    console.log(`❌ Excel file not found: ${excelFilePath}`);
    return;
  }
  
  console.log(`📁 Reading Excel file: ${excelFilePath}`);
  
  // Read patterns from Excel
  const patterns = readExcelToPatterns(excelFilePath);
  
  if (Object.keys(patterns).length === 0) {
    console.log('❌ No patterns found in Excel file');
    console.log('💡 Make sure your Excel file has columns for Vehicle and Missed Checkpoints');
    return;
  }
  
  // Save patterns to file
  const patternsFile = savePatternsToFile(patterns);
  
  if (patternsFile) {
    // Validate patterns against vehicle templates
    const validation = validatePatterns(patterns);
    
    console.log(`\n📈 Summary:`);
    console.log(`- Patterns extracted: ${Object.keys(patterns).length} vehicles`);
    console.log(`- Patterns file: ${patternsFile}`);
    console.log(`- Validation: ${validation.valid ? '✅ Valid' : '⚠️  Issues found'}`);
    
    // Show sample patterns
    console.log(`\n📋 Sample Patterns:`);
    const sampleVehicles = Object.keys(patterns).slice(0, 3);
    sampleVehicles.forEach(vehicle => {
      console.log(`${vehicle}: [${patterns[vehicle].slice(0, 10).join(', ')}...]`);
    });
    
    console.log(`\n💡 Next steps:`);
    console.log(`1. Review the patterns in ${patternsFile}`);
    console.log(`2. Run: node generateMonthlyData.js`);
    console.log(`3. The monthly data generator will use these patterns automatically`);
  }
}

// Export functions for use in other modules
module.exports = {
  readExcelToPatterns,
  savePatternsToFile,
  loadPatternsFromFile,
  createSamplePatterns,
  validatePatterns
};

// Run the script if called directly
if (require.main === module) {
  main();
} 