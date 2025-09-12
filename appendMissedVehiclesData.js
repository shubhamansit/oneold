const fs = require('fs');

function appendMissedVehiclesData() {
  try {
    console.log('📅 Appending missed vehicles data to index.ts...');
    
    // Read the updated monthly data
    const monthlyData = JSON.parse(fs.readFileSync('monthlyData_2025_08.json', 'utf8'));
    console.log(`📅 Loaded monthly data: ${monthlyData.length} records`);
    
    // Filter only the missed vehicles (they have Vehicle- prefix)
    const missedVehiclesData = monthlyData.filter(record => 
      record.Vehicle.startsWith('Vehicle-')
    );
    
    console.log(`📊 Found ${missedVehiclesData.length} records for missed vehicles`);
    
    // Read the main index.ts file
    const indexPath = 'data/index.ts';
    let content = fs.readFileSync(indexPath, 'utf8');
    console.log(`📁 Read index.ts file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Find the end of the file (before the closing bracket)
    const lastBracketIndex = content.lastIndexOf(']');
    if (lastBracketIndex === -1) {
      console.error('❌ Could not find end of data array');
      return false;
    }
    
    // Convert missed vehicles data to the format expected in the main file
    const missedVehiclesDataString = missedVehiclesData.map(record => {
      return `  ${JSON.stringify(record, null, 2).replace(/\n/g, '\n  ')}`;
    }).join(',\n');
    
    // Insert the missed vehicles data before the closing bracket
    const beforeBracket = content.substring(0, lastBracketIndex);
    const afterBracket = content.substring(lastBracketIndex);
    
    // Check if there's already data (not just empty array)
    const hasExistingData = beforeBracket.trim().endsWith('}') || beforeBracket.trim().endsWith(']');
    
    let newContent;
    if (hasExistingData) {
      // Add comma and new data
      newContent = beforeBracket + ',\n' + missedVehiclesDataString + afterBracket;
    } else {
      // Replace empty array with new data
      newContent = beforeBracket + missedVehiclesDataString + afterBracket;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(indexPath, newContent);
    
    console.log(`🎉 Successfully appended ${missedVehiclesData.length} missed vehicles records!`);
    console.log(`📊 Total records: ${missedVehiclesData.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error appending missed vehicles data:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  appendMissedVehiclesData();
}

module.exports = { appendMissedVehiclesData };