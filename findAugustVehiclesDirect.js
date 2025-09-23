const fs = require('fs');

function findAugustVehiclesDirect() {
    console.log('🔍 Finding August 2025 vehicles directly...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Count total August 2025 records
        const augustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Total August 2025 records: ${augustRecords}`);
        
        // Find all August 2025 records and extract vehicle information
        const vehiclesWithAugustData = new Set();
        
        // Split the content by August dates and process each section
        const augustSections = indexContent.split(/"Date": "2025-08-/);
        
        console.log(`📊 Found ${augustSections.length - 1} August sections`);
        
        // Process each August section
        for (let i = 1; i < augustSections.length; i++) {
            const section = augustSections[i];
            
            // Look for Vehicle field in this section
            const vehicleMatch = section.match(/"Vehicle":\s*"([^"]+)"/);
            if (vehicleMatch) {
                vehiclesWithAugustData.add(vehicleMatch[1]);
            }
        }
        
        console.log(`📊 Unique vehicles with August 2025 data: ${vehiclesWithAugustData.size}`);
        
        // Show all vehicles
        console.log('\n📋 All vehicles with August 2025 data:');
        const vehiclesArray = Array.from(vehiclesWithAugustData).sort();
        vehiclesArray.forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle}`);
        });
        
        // Check for specific vehicles
        const specificVehicles = ['GJ06BX0741', 'GJ06BX0761', 'GJ04GB0086'];
        console.log('\n🔍 Checking specific vehicles:');
        
        specificVehicles.forEach(vehicle => {
            let found = false;
            let foundAs = '';
            
            for (const existingVehicle of vehiclesWithAugustData) {
                if (existingVehicle.includes(vehicle)) {
                    found = true;
                    foundAs = existingVehicle;
                    break;
                }
            }
            
            if (found) {
                console.log(`✅ ${vehicle} found as: ${foundAs}`);
            } else {
                console.log(`❌ ${vehicle} not found`);
            }
        });
        
        // Check if the issue is with the data structure
        console.log('\n🔍 Checking data structure around August records...');
        
        // Find the first August record
        const firstAugustIndex = indexContent.indexOf('"Date": "2025-08-');
        if (firstAugustIndex !== -1) {
            const context = indexContent.substring(
                Math.max(0, firstAugustIndex - 200), 
                Math.min(indexContent.length, firstAugustIndex + 1000)
            );
            
            console.log('\n📋 Context around first August record:');
            console.log(context);
            
            // Check if there's a Vehicle field in this context
            const vehicleInContext = context.match(/"Vehicle":\s*"([^"]+)"/);
            if (vehicleInContext) {
                console.log(`\n✅ Found vehicle in context: ${vehicleInContext[1]}`);
            } else {
                console.log('\n❌ No vehicle found in context');
            }
        }
        
        console.log('\n✅ Direct search completed!');
        
    } catch (error) {
        console.error('❌ Error in direct search:', error.message);
    }
}

findAugustVehiclesDirect();