const fs = require('fs');

function appendMissedVehiclesSafely() {
  try {
    console.log('📅 Safely appending missed vehicles data to index.ts...');
    
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
    
    // Check if any of these missed vehicles already exist in the main data
    const existingVehicleIds = new Set();
    const vehicleIdPattern = /"Vehicle":\s*"([^"]+)"/g;
    let match;
    while ((match = vehicleIdPattern.exec(content)) !== null) {
      existingVehicleIds.add(match[1]);
    }
    
    console.log(`📊 Found ${existingVehicleIds.size} existing vehicle IDs in main data`);
    
    // Filter out vehicles that already exist
    const newVehiclesData = missedVehiclesData.filter(record => {
      const vehicleId = record.Vehicle;
      const exists = existingVehicleIds.has(vehicleId);
      if (exists) {
        console.log(`  ⚠️  Vehicle ${vehicleId} already exists, skipping...`);
      }
      return !exists;
    });
    
    console.log(`📊 New vehicles to add: ${newVehiclesData.length} (${missedVehiclesData.length - newVehiclesData.length} already exist)`);
    
    if (newVehiclesData.length === 0) {
      console.log('✅ No new vehicles to add - all missed vehicles already exist in main data');
      return true;
    }
    
    // Find the end of the file (before the closing bracket)
    const lastBracketIndex = content.lastIndexOf(']');
    if (lastBracketIndex === -1) {
      console.error('❌ Could not find end of data array');
      return false;
    }
    
    // Convert new vehicles data to the format expected in the main file
    const newVehiclesDataString = newVehiclesData.map(record => {
      return `  ${JSON.stringify(record, null, 2).replace(/\n/g, '\n  ')}`;
    }).join(',\n');
    
    // Insert the new vehicles data before the closing bracket
    const beforeBracket = content.substring(0, lastBracketIndex);
    const afterBracket = content.substring(lastBracketIndex);
    
    // Check if there's already data (not just empty array)
    const hasExistingData = beforeBracket.trim().endsWith('}') || beforeBracket.trim().endsWith(']');
    
    let newContent;
    if (hasExistingData) {
      // Add comma and new data
      newContent = beforeBracket + ',\n' + newVehiclesDataString + afterBracket;
    } else {
      // Replace empty array with new data
      newContent = beforeBracket + newVehiclesDataString + afterBracket;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(indexPath, newContent);
    
    console.log(`🎉 Successfully appended ${newVehiclesData.length} new vehicle records!`);
    console.log(`📊 Total new records: ${newVehiclesData.length}`);
    console.log(`✅ No duplicates created`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error safely appending missed vehicles data:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  appendMissedVehiclesSafely();
}

module.exports = { appendMissedVehiclesSafely };