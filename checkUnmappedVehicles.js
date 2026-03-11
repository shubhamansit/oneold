const fs = require('fs');

function checkUnmappedVehicles() {
  try {
    // Load October monthly data
    const octoberFile = 'monthlyData_2025_10.json';
    const octoberData = JSON.parse(fs.readFileSync(octoberFile, 'utf8'));
    
    // Get unique vehicles from October data
    const octoberVehicles = [...new Set(octoberData.map(r => r.Vehicle))];
    console.log(`📊 Total unique vehicles in October data: ${octoberVehicles.length}\n`);
    
    // Load zone files
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' }
    ];
    
    // Collect all job names from all zones
    const allJobNames = new Set();
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data.forEach(record => {
        if (record["Job Name"]) {
          allJobNames.add(record["Job Name"]);
        }
      });
    });
    
    console.log(`📊 Total unique job names in zone files: ${allJobNames.size}\n`);
    
    // Check which October vehicles don't have matches
    const unmappedVehicles = [];
    
    octoberVehicles.forEach(octoberVehicle => {
      let foundMatch = false;
      
      // Extract route code from October vehicle
      const routeMatch = octoberVehicle.match(/(\d{2}-\d{2}-\d{4})/);
      if (routeMatch) {
        const routeCode = routeMatch[1];
        
        // Check if any job name contains this route code
        for (const jobName of allJobNames) {
          if (jobName.includes(routeCode)) {
            foundMatch = true;
            break;
          }
        }
      }
      
      // Try other matching strategies
      if (!foundMatch) {
        // Try matching by vehicle number parts
        const vehicleNumberMatch = octoberVehicle.match(/(\d{2}-\d{2}-\d{4})/);
        if (vehicleNumberMatch) {
          const vehicleNumber = vehicleNumberMatch[1];
          const normalizedVehicle = vehicleNumber.replace(/-/g, '');
          
          for (const jobName of allJobNames) {
            const normalizedJob = jobName.replace(/[-\s]/g, '');
            if (normalizedJob.includes(normalizedVehicle) || jobName.includes(vehicleNumber)) {
              foundMatch = true;
              break;
            }
          }
        }
      }
      
      if (!foundMatch) {
        unmappedVehicles.push(octoberVehicle);
      }
    });
    
    console.log(`\n❌ Unmapped vehicles (${unmappedVehicles.length}):\n`);
    unmappedVehicles.forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle}`);
      
      // Try to extract route code and show what we're looking for
      const routeMatch = vehicle.match(/(\d{2}-\d{2}-\d{4})/);
      if (routeMatch) {
        const routeCode = routeMatch[1];
        console.log(`   Looking for route code: ${routeCode}`);
        
        // Show similar job names
        const similarJobs = Array.from(allJobNames).filter(job => {
          const jobRouteMatch = job.match(/(\d{2}-\d{2}-\d{4})/);
          if (jobRouteMatch) {
            const jobRouteCode = jobRouteMatch[1];
            // Check if route codes are similar (same last 4 digits)
            return jobRouteCode.split('-')[2] === routeCode.split('-')[2];
          }
          return false;
        });
        
        if (similarJobs.length > 0) {
          console.log(`   Similar job names found (same last 4 digits):`);
          similarJobs.slice(0, 5).forEach(job => console.log(`     - ${job}`));
        }
      }
      console.log('');
    });
    
    // Also check which vehicles from October were mentioned in the Excel processing warnings
    console.log('\n📋 Vehicles that were mentioned as "No template found" during Excel processing:');
    console.log('   - GJ04GB0283');
    console.log('   - GJ04BX0728');
    console.log('   - GJ04GB0610');
    console.log('   - GJ06BX0435');
    console.log('   - GJ06BX1782');
    console.log('   - GJ04GA0664');
    console.log('   - GJ04GA0732');
    console.log('   - GJ04GB0182');
    console.log('   - GJ06BX1700');
    console.log('   - GJ04GA0511');
    console.log('   - GJ06BX0306');
    console.log('   - GJ04GA0540');
    console.log('   - GJ06BX1871');
    console.log('   - GJ06BX0879');
    console.log('   - GJ04GB0482');
    console.log('   - GJ 06 BX 0309 E1');
    console.log('   - TOTEL POI =');
    
    return unmappedVehicles;
    
  } catch (error) {
    console.error('❌ Error checking unmapped vehicles:', error);
    return [];
  }
}

// Run the function
if (require.main === module) {
  checkUnmappedVehicles();
}

module.exports = { checkUnmappedVehicles };

