const fs = require('fs');

function findUnmappedMatches() {
  // Load all zone files
  const zoneFiles = [
    { path: 'data/wastZone.json', name: 'wastZone' },
    { path: 'data/eastZone.json', name: 'eastZone' },
    { path: 'data/general.json', name: 'general' }
  ];
  
  const unmappedVehicles = [
    'GJ 04 GB 0426 01-08 - ENTRA',
    'GJ-06-BX-0761 - ENTRA',
    'GJ 04 GB 0309 ROUTE 04-10 - TRUCK',
    'GJ 06 BX 0386 W-1 - TRUCK',
    'GJ 06 BX 0309  E-1 - truck'
  ];
  
  console.log('🔍 Searching for matches for unmapped vehicles:\n');
  
  unmappedVehicles.forEach(vehicle => {
    console.log(`\n📋 Vehicle: ${vehicle}`);
    
    // Extract route code - try multiple patterns
    let routeCode = null;
    let routeMatch = vehicle.match(/(\d{2}-\d{2}-\d{4})/);
    
    if (!routeMatch) {
      // Try pattern like "01-08" or "04-10"
      routeMatch = vehicle.match(/(\d{2}-\d{2})/);
      if (routeMatch) {
        // For vehicles like "GJ 04 GB 0426 01-08 - ENTRA", we need to find the full route
        // The format might be "01-08-0426" but written as "01-08"
        const partialRoute = routeMatch[1];
        const vehicleNumMatch = vehicle.match(/(\d{4})/);
        if (vehicleNumMatch) {
          const vehicleNum = vehicleNumMatch[1];
          routeCode = `${partialRoute}-${vehicleNum}`;
        }
      }
    } else {
      routeCode = routeMatch[1];
    }
    
    // Special cases
    if (vehicle.includes('0386')) {
      routeCode = 'W-1-0386'; // Special format
    } else if (vehicle.includes('0309') && vehicle.includes('E-1')) {
      routeCode = 'E-1-0309'; // Special format
    } else if (vehicle.includes('0761')) {
      // Try to find route code for 0761
      routeCode = '12-07-0761'; // Might be this format
    }
    
    if (routeCode) {
      console.log(`   Route code: ${routeCode}`);
      
      // Also try to extract vehicle number parts
      zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Extract search terms from vehicle
        const searchTerms = [];
        if (vehicle.includes('0386')) searchTerms.push('0386', 'W-1-0386', 'W-1');
        if (vehicle.includes('0309')) searchTerms.push('0309', 'E-1-0309', 'E-1');
        if (vehicle.includes('0761')) searchTerms.push('0761');
        if (vehicle.includes('0426')) searchTerms.push('0426', '01-08-0426', '01-08');
        if (vehicle.includes('04-10')) searchTerms.push('04-10', '04-10-0309');
        
        // Look for exact route match
        const exactMatches = data.filter(record => {
          const jobName = record["Job Name"] || '';
          return routeCode && jobName.includes(routeCode);
        });
        
        // Look for vehicle number matches
        const vehicleMatches = data.filter(record => {
          const jobName = record["Job Name"] || '';
          const moreDetails = record.more_details || [];
          
          // Check job name
          if (searchTerms.some(term => jobName.includes(term))) {
            return true;
          }
          
          // Check vehicle names in more_details
          return moreDetails.some(detail => {
            const detailVehicle = detail.Vehicle || '';
            return searchTerms.some(term => detailVehicle.includes(term));
          });
        });
        
        if (exactMatches.length > 0) {
          console.log(`   ✅ ${zoneName}: Found ${exactMatches.length} exact match(es):`);
          exactMatches.slice(0, 3).forEach(match => {
            console.log(`      - "${match["Job Name"]}"`);
          });
        } else if (vehicleMatches.length > 0) {
          console.log(`   🔗 ${zoneName}: Found ${vehicleMatches.length} vehicle number match(es):`);
          vehicleMatches.slice(0, 3).forEach(match => {
            console.log(`      - "${match["Job Name"]}"`);
            if (match.more_details && match.more_details.length > 0) {
              const vehicle = match.more_details[0].Vehicle;
              if (vehicle) {
                console.log(`        Vehicle in details: ${vehicle}`);
              }
            }
          });
        } else {
          console.log(`   ❌ ${zoneName}: No matches found`);
        }
      });
    } else {
      console.log(`   ⚠️  Could not extract route code from vehicle name`);
      // Still try to search by vehicle numbers
      const searchTerms = [];
      if (vehicle.includes('0386')) searchTerms.push('0386', 'W-1');
      if (vehicle.includes('0309')) searchTerms.push('0309', 'E-1');
      if (vehicle.includes('0761')) searchTerms.push('0761');
      if (vehicle.includes('0426')) searchTerms.push('0426', '01-08');
      
      if (searchTerms.length > 0) {
        zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const matches = data.filter(record => {
            const jobName = record["Job Name"] || '';
            const moreDetails = record.more_details || [];
            return searchTerms.some(term => jobName.includes(term)) ||
                   moreDetails.some(detail => {
                     const detailVehicle = detail.Vehicle || '';
                     return searchTerms.some(term => detailVehicle.includes(term));
                   });
          });
          
          if (matches.length > 0) {
            console.log(`   🔍 ${zoneName}: Found ${matches.length} match(es) by vehicle number:`);
            matches.slice(0, 3).forEach(match => {
              console.log(`      - "${match["Job Name"]}"`);
            });
          }
        });
      }
    }
  });
}

findUnmappedMatches();

