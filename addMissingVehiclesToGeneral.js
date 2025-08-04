const fs = require('fs');

function addMissingVehiclesToGeneral() {
  try {
    console.log('🔧 Adding missing vehicles to general array...');
    
    // Read vehicle templates to get the base structure
    const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
    
    // Find the templates for the missing vehicles
    const missingVehicles = [
      'GJ-06-BX-0761 - ENTRA',
      'GJ 06 BX 0386 W-1 - TRUCK'
    ];
    
    const vehicleTemplates = [];
    missingVehicles.forEach(vehicleName => {
      const template = templates.find(t => t.Vehicle === vehicleName);
      if (template) {
        vehicleTemplates.push(template);
        console.log(`✅ Found template for: ${vehicleName}`);
      } else {
        console.log(`❌ No template found for: ${vehicleName}`);
      }
    });
    
    if (vehicleTemplates.length === 0) {
      console.log('❌ No templates found for missing vehicles');
      return;
    }
    
    // Read the index.ts file
    const indexPath = 'data/index.ts';
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Find the general array
    const generalMatch = content.match(/export const general = \[([\s\S]*?)\];/);
    if (!generalMatch) {
      console.log('❌ Could not find general array in index.ts');
      return;
    }
    
    const generalContent = generalMatch[1];
    const generalData = eval(`([${generalContent}])`);
    
    console.log(`📊 Current general array has ${generalData.length} vehicles`);
    
    // Read monthly data files to get the data for these vehicles
    const monthlyFiles = [
      'monthlyData_2025_01.json',
      'monthlyData_2025_02.json',
      'monthlyData_2025_03.json',
      'monthlyData_2025_04.json',
      'monthlyData_2025_05.json',
      'monthlyData_2025_06.json'
    ];
    
    // Create new vehicle records for the missing vehicles
    const newVehicles = [];
    
    vehicleTemplates.forEach(template => {
      const vehicleName = template.Vehicle;
      console.log(`\n🔄 Processing vehicle: ${vehicleName}`);
      
      // Collect monthly data for this vehicle
      const monthlyData = [];
      
      monthlyFiles.forEach(monthlyFile => {
        if (fs.existsSync(monthlyFile)) {
          const month = monthlyFile.match(/monthlyData_2025_(\d{2})\.json/)[1];
          const data = JSON.parse(fs.readFileSync(monthlyFile, 'utf8'));
          
          // Find records for this vehicle
          const vehicleRecords = data.filter(record => record.Vehicle === vehicleName);
          
          if (vehicleRecords.length > 0) {
            console.log(`  📅 Found ${vehicleRecords.length} records for month ${month}`);
            monthlyData.push(...vehicleRecords);
          } else {
            console.log(`  ⚠️  No records found for month ${month}`);
          }
        }
      });
      
      if (monthlyData.length > 0) {
        // Create the vehicle record
        const newVehicle = {
          ...template,
          "more_details": monthlyData
        };
        
        newVehicles.push(newVehicle);
        console.log(`  ✅ Created vehicle record with ${monthlyData.length} monthly records`);
      } else {
        console.log(`  ❌ No monthly data found for ${vehicleName}`);
      }
    });
    
    if (newVehicles.length === 0) {
      console.log('❌ No new vehicles to add');
      return;
    }
    
    // Add new vehicles to general array
    const updatedGeneralData = [...generalData, ...newVehicles];
    
    console.log(`\n📊 Updated general array will have ${updatedGeneralData.length} vehicles`);
    
    // Create backup
    const backupPath = `data/index_backup_before_adding_missing_vehicles_${new Date().toISOString().replace(/[:.]/g, '-')}.ts`;
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log(`💾 Created backup: ${backupPath}`);
    
    // Update the content
    const updatedGeneralContent = JSON.stringify(updatedGeneralData, null, 2);
    const newGeneralMatch = `export const general = ${updatedGeneralContent};`;
    const updatedContent = content.replace(generalMatch, newGeneralMatch);
    
    // Write the updated file
    fs.writeFileSync(indexPath, updatedContent, 'utf8');
    
    console.log(`\n✅ SUCCESSFULLY ADDED MISSING VEHICLES TO GENERAL:`);
    newVehicles.forEach(vehicle => {
      console.log(`  🚛 ${vehicle.Vehicle} - ${vehicle.more_details.length} monthly records`);
    });
    
    console.log(`📁 Updated file: ${indexPath}`);
    
  } catch (error) {
    console.error('❌ Error adding missing vehicles:', error);
  }
}

// Run the function
if (require.main === module) {
  addMissingVehiclesToGeneral();
}

module.exports = { addMissingVehiclesToGeneral }; 