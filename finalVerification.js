const fs = require('fs');

function finalVerification() {
    console.log('🔍 Final verification of August 2025 vehicles...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Count total August 2025 records
        const augustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Total August 2025 records: ${augustRecords}`);
        
        // Find all unique vehicles with August 2025 data
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
        
        // Check for specific vehicles mentioned by the user
        const specificVehicles = ['GJ06BX0741', 'GJ06BX0761', 'GJ04GB0086'];
        console.log('\n🔍 Checking specific vehicles:');
        
        specificVehicles.forEach(vehicle => {
            let found = false;
            let foundAs = '';
            
            for (const existingVehicle of vehiclesWithAugustData) {
                // Check if the vehicle ID is contained in the full vehicle name
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
        
        // Show all vehicles with August 2025 data
        console.log('\n📋 All vehicles with August 2025 data:');
        const vehiclesArray = Array.from(vehiclesWithAugustData).sort();
        vehiclesArray.forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle}`);
        });
        
        // Check if there are any vehicles that match the Excel format
        console.log('\n🔍 Checking for vehicles in Excel format:');
        const excelFormatVehicles = vehiclesArray.filter(v => 
            v.match(/^GJ\d{2}[A-Z]{2}\d{4}$/) || 
            v.includes('GJ06BX0741') || 
            v.includes('GJ06BX0761') || 
            v.includes('GJ04GB0086')
        );
        
        if (excelFormatVehicles.length > 0) {
            console.log(`📊 Found ${excelFormatVehicles.length} vehicles in Excel format:`);
            excelFormatVehicles.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        } else {
            console.log('❌ No vehicles found in Excel format');
        }
        
        // Check for vehicles that contain the specific IDs
        console.log('\n🔍 Checking for vehicles containing specific IDs:');
        specificVehicles.forEach(vehicle => {
            const matchingVehicles = vehiclesArray.filter(v => v.includes(vehicle));
            if (matchingVehicles.length > 0) {
                console.log(`✅ ${vehicle} found in ${matchingVehicles.length} vehicle(s):`);
                matchingVehicles.forEach(match => {
                    console.log(`   - ${match}`);
                });
            } else {
                console.log(`❌ ${vehicle} not found in any vehicle names`);
            }
        });
        
        console.log('\n✅ Final verification completed!');
        
    } catch (error) {
        console.error('❌ Error in final verification:', error.message);
    }
}

finalVerification();