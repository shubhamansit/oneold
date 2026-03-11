const fs = require('fs');

// Function to create a template for a missing vehicle
function createVehicleTemplate(excelVehicleId, routeCode, tpoi, similarTemplate) {
  // Extract vehicle parts from Excel ID (e.g., GJ04GB0482 -> GJ 04 GB 0482)
  const vehicleMatch = excelVehicleId.match(/GJ(\d{2})([A-Z]+)(\d{4})/);
  if (!vehicleMatch) {
    console.error(`Cannot parse vehicle ID: ${excelVehicleId}`);
    return null;
  }
  
  const [, district, type, number] = vehicleMatch;
  const vehicleName = `GJ ${district} ${type} ${number} RUT ${routeCode}`;
  
  // Use similar template as base, or create defaults
  const template = similarTemplate ? { ...similarTemplate } : {
    "Date": "2025-01-01 23:30:00",
    "Start Time": "2025-01-01 00:00:00",
    "End Time": "2025-01-01 18:00:00",
    "Actual Start Time": "2025-01-01 05:30:00",
    "Actual End Time": "2025-01-01 11:30:00",
    "On-Time": 0,
    "Early": 0,
    "Delay": 0,
    "Total Visited Checkpoints": 0,
    "Missed Checkpoints": 0,
    "Checkpoints Complete Status(%)": 0,
    "Estimated Distance": 20,
    "Distance": 0,
    "Distance Completed %": 0,
    "On Route": 0,
    "On Route %": 100,
    "Off Route": 0,
    "Off Route %": 0,
    "Early Arrival Condition(Minute)": "0:00",
    "Delay Arrival Condition(Minute)": "0:00",
    "Group Name": "--",
    "Penalty": 0,
    "Reason": "--",
    "Remark": "--",
    "Assigned": `${excelVehicleId} ${excelVehicleId}`,
    "Present": `${excelVehicleId} ${excelVehicleId}`,
    "Waste Weight": 0,
    "Incidents": 0,
    "avg_halt_time": "3:30"
  };
  
  // Update vehicle-specific fields
  template.Vehicle = vehicleName;
  template["Planned Checkpoints"] = tpoi || 50; // Use T-POI from Excel or default
  
  return template;
}

function addMissingVehicles() {
  try {
    console.log('📋 Adding missing vehicles to vehicleTemplates.json...');
    
    // Load existing templates
    const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
    console.log(`📊 Current templates: ${templates.length}`);
    
    // Find a similar template for reference
    const similarTemplate = templates.find(t => 
      t.Vehicle && t.Vehicle.includes('GJ 04 GB') && t.Vehicle.includes('RUT')
    );
    
    // Missing vehicles data from Excel analysis
    const missingVehicles = [
      {
        excelId: 'GJ04GB0482',
        route: '13-13-0482',
        tpoi: 42,
        vehicleName: 'GJ 04 GB 0482 RUT 13-13-0482'
      },
      {
        excelId: 'GJ04GA0780',
        route: '12-06-0780',
        tpoi: 44,
        vehicleName: 'GJ 04 GA 0780 RUT 12-06-0780'
      },
      {
        excelId: 'GJ06BX0306',
        route: '12-10-0306',
        tpoi: 10,
        vehicleName: 'GJ 06 BX 0306 RUT 12-10-0306'
      },
      {
        excelId: 'GJ04GB0182',
        route: '11-10-0182',
        tpoi: 10,
        vehicleName: 'GJ 04 GB 0182 RUT 11-10-0182'
      }
    ];
    
    // Check which ones already exist
    const existingVehicles = new Set(templates.map(t => t.Vehicle));
    const toAdd = [];
    
    missingVehicles.forEach(mv => {
      // Check if vehicle already exists
      const exists = Array.from(existingVehicles).some(v => 
        v.includes(mv.route) || v.includes(mv.excelId.replace(/(\d{2})([A-Z]+)(\d{4})/, '$1 $2 $3'))
      );
      
      if (!exists) {
        // Find similar template based on vehicle type
        let similar = null;
        if (mv.excelId.includes('GJ 04 GB') || mv.excelId.includes('GJ04GB')) {
          similar = templates.find(t => t.Vehicle && t.Vehicle.includes('GJ 04 GB') && t.Vehicle.includes('RUT'));
        } else if (mv.excelId.includes('GJ 04 GA') || mv.excelId.includes('GJ04GA')) {
          similar = templates.find(t => t.Vehicle && t.Vehicle.includes('GJ 04 GA') && t.Vehicle.includes('RUT'));
        } else if (mv.excelId.includes('GJ 06 BX') || mv.excelId.includes('GJ06BX')) {
          similar = templates.find(t => t.Vehicle && t.Vehicle.includes('GJ 06 BX') && t.Vehicle.includes('RUT'));
        }
        
        const newTemplate = createVehicleTemplate(mv.excelId, mv.route, mv.tpoi, similar);
        if (newTemplate) {
          toAdd.push(newTemplate);
          console.log(`✅ Created template for: ${mv.vehicleName} (T-POI: ${mv.tpoi})`);
        }
      } else {
        console.log(`⚠️  Vehicle already exists: ${mv.vehicleName}`);
      }
    });
    
    if (toAdd.length === 0) {
      console.log('✅ No new vehicles to add');
      return;
    }
    
    // Add new templates
    const updatedTemplates = [...templates, ...toAdd];
    
    // Save updated templates
    fs.writeFileSync('vehicleTemplates.json', JSON.stringify(updatedTemplates, null, 2), 'utf8');
    
    console.log(`\n🎉 Successfully added ${toAdd.length} new vehicle templates!`);
    console.log(`📊 Total templates: ${updatedTemplates.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error adding missing vehicles:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  addMissingVehicles();
}

module.exports = { addMissingVehicles, createVehicleTemplate };
