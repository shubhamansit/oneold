const XLSX = require('xlsx');
const fs = require('fs');

console.log('Processing September 2025 data...');

try {
  // Read the Excel file
  const workbook = XLSX.readFile('SEPT 09 2025 osc..xlsx');
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${jsonData.length} rows in September 2025 data`);
  
  // Group data by zone
  const wastZone = [];
  const eastZone = [];
  const general = [];
  const brigrajsinh = [];
  
  jsonData.forEach((row, index) => {
    // Add null checks and data validation
    if (!row || !row.Zone) {
      console.warn(`Row ${index} missing Zone data:`, row);
      return;
    }
    
    // Clean and structure the data
    const cleanRow = {
      Branch: row.Branch || 'BMC',
      Town: row.Town || 'BHAVNAGAR_OSC',
      Zone: row.Zone,
      Ward: row.Ward || '',
      'Job Name': row['Job Name'] || '',
      'Job Type': row['Job Type'] || 'Waste Collection',
      'Total Jobs': parseInt(row['Total Jobs']) || 0,
      'Completed': parseInt(row['Completed']) || 0,
      'Completed With Issue': parseInt(row['Completed With Issue']) || 0,
      'Failed': parseInt(row['Failed']) || 0,
      'Penalty': parseInt(row['Penalty']) || 0,
      'Assigned Helpers': parseInt(row['Assigned Helpers']) || 0,
      more_details: row.more_details || []
    };
    
    // Group by zone
    switch (row.Zone) {
      case 'WEST_ZONE':
        if (row.Town === 'BRIGRAJSINH') {
          brigrajsinh.push(cleanRow);
        } else {
          wastZone.push(cleanRow);
        }
        break;
      case 'EAST_ZONE':
        eastZone.push(cleanRow);
        break;
      case 'GENERAL':
        general.push(cleanRow);
        break;
      default:
        console.warn(`Unknown zone: ${row.Zone} for row ${index}`);
    }
  });
  
  console.log('Data grouped by zone:');
  console.log(`- WEST_ZONE: ${wastZone.length} entries`);
  console.log(`- EAST_ZONE: ${eastZone.length} entries`);
  console.log(`- GENERAL: ${general.length} entries`);
  console.log(`- BRIGRAJSINH: ${brigrajsinh.length} entries`);
  
  // Read existing data files
  let existingWastZone = [];
  let existingEastZone = [];
  let existingGeneral = [];
  let existingBrigrajsinh = [];
  
  try {
    existingWastZone = JSON.parse(fs.readFileSync('./data/wastZone.json', 'utf8'));
    existingEastZone = JSON.parse(fs.readFileSync('./data/eastZone.json', 'utf8'));
    existingGeneral = JSON.parse(fs.readFileSync('./data/general.json', 'utf8'));
    existingBrigrajsinh = JSON.parse(fs.readFileSync('./data/brigrajsinh.json', 'utf8'));
  } catch (error) {
    console.log('Creating new data files...');
  }
  
  // Merge with existing data
  const mergedWastZone = [...existingWastZone, ...wastZone];
  const mergedEastZone = [...existingEastZone, ...eastZone];
  const mergedGeneral = [...existingGeneral, ...general];
  const mergedBrigrajsinh = [...existingBrigrajsinh, ...brigrajsinh];
  
  // Write updated data files
  fs.writeFileSync('./data/wastZone.json', JSON.stringify(mergedWastZone, null, 2));
  fs.writeFileSync('./data/eastZone.json', JSON.stringify(mergedEastZone, null, 2));
  fs.writeFileSync('./data/general.json', JSON.stringify(mergedGeneral, null, 2));
  fs.writeFileSync('./data/brigrajsinh.json', JSON.stringify(mergedBrigrajsinh, null, 2));
  
  console.log('September 2025 data successfully processed and merged!');
  console.log('Updated totals:');
  console.log(`- WEST_ZONE: ${mergedWastZone.length} entries`);
  console.log(`- EAST_ZONE: ${mergedEastZone.length} entries`);
  console.log(`- GENERAL: ${mergedGeneral.length} entries`);
  console.log(`- BRIGRAJSINH: ${mergedBrigrajsinh.length} entries`);
  
} catch (error) {
  console.error('Error processing September 2025 data:', error);
}