const fs = require('fs');

function findAugustVehicles() {
    console.log('🔍 Finding vehicles with August 2025 data...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Count total August 2025 records
        const augustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Total August 2025 records: ${augustRecords}`);
        
        // Find all August 2025 records and extract vehicle information
        const vehiclesWithAugustData = new Set();
        const augustPattern = /"Date": "2025-08-(\d{2})"/g;
        let match;
        
        while ((match = augustPattern.exec(indexContent)) !== null) {
            const dateIndex = match.index;
            
            // Look for Vehicle field in the surrounding context
            const start = Math.max(0, dateIndex - 1000);
            const end = Math.min(indexContent.length, dateIndex + 1000);
            const context = indexContent.substring(start, end);
            
            // Find Vehicle field in this context
            const vehicleMatch = context.match(/"Vehicle":\s*"([^"]+)"/);
            if (vehicleMatch) {
                vehiclesWithAugustData.add(vehicleMatch[1]);
            }
        }
        
        console.log(`📊 Unique vehicles with August 2025 data: ${vehiclesWithAugustData.size}`);
        
        // Show sample vehicles
        console.log('\n📋 Sample vehicles with August 2025 data:');
        const vehiclesArray = Array.from(vehiclesWithAugustData);
        vehiclesArray.slice(0, 20).forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle}`);
        });
        
        // Check for specific vehicles
        const specificVehicles = ['GJ06BX0741', 'GJ06BX0761', 'GJ04GB0086'];
        console.log('\n🔍 Checking specific vehicles:');
        specificVehicles.forEach(vehicle => {
            let found = false;
            for (const existingVehicle of vehiclesWithAugustData) {
                if (existingVehicle.includes(vehicle) || vehicle.includes(existingVehicle)) {
                    console.log(`✅ ${vehicle} found as: ${existingVehicle}`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`❌ ${vehicle} not found`);
            }
        });
        
        // Check if vehicles are in the expected format
        console.log('\n🔍 Checking vehicle formats:');
        const shortFormatVehicles = vehiclesArray.filter(v => v.length < 20);
        const longFormatVehicles = vehiclesArray.filter(v => v.length >= 20);
        
        console.log(`📊 Short format vehicles (< 20 chars): ${shortFormatVehicles.length}`);
        console.log(`📊 Long format vehicles (>= 20 chars): ${longFormatVehicles.length}`);
        
        if (shortFormatVehicles.length > 0) {
            console.log('\n📋 Sample short format vehicles:');
            shortFormatVehicles.slice(0, 10).forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        }
        
        if (longFormatVehicles.length > 0) {
            console.log('\n📋 Sample long format vehicles:');
            longFormatVehicles.slice(0, 10).forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        }
        
        console.log('\n✅ Vehicle search completed!');
        
    } catch (error) {
        console.error('❌ Error finding vehicles:', error.message);
    }
}

findAugustVehicles();