const fs = require('fs');

function checkMissingAugustVehicles() {
    console.log('🔍 Checking for missing August 2025 vehicles...\n');
    
    try {
        // Read the monthly data file
        console.log('📁 Reading monthlyData_2025_08.json...');
        const monthlyData = JSON.parse(fs.readFileSync('monthlyData_2025_08.json', 'utf8'));
        
        console.log(`📊 Total records in monthly data: ${monthlyData.length}`);
        
        // Get unique vehicles from monthly data
        const vehiclesInMonthlyData = new Set();
        monthlyData.forEach(record => {
            vehiclesInMonthlyData.add(record.Vehicle);
        });
        
        console.log(`📊 Unique vehicles in monthly data: ${vehiclesInMonthlyData.size}`);
        
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const content = fs.readFileSync('data/index.ts', 'utf8');
        
        // Extract all August 2025 records from index.ts
        const augustMatches = content.match(/"Date":\s*"2025-08-\d{2}\s+\d{2}:\d{2}:\d{2}"/g);
        console.log(`📊 August 2025 records in index.ts: ${augustMatches ? augustMatches.length : 0}`);
        
        // Extract unique vehicles from August 2025 data in index.ts
        const augustVehiclesInIndex = new Set();
        const augustVehicleMatches = content.match(/"Vehicle":\s*"[^"]*"/g);
        
        if (augustVehicleMatches) {
            augustVehicleMatches.forEach(match => {
                const vehicle = match.match(/"Vehicle":\s*"([^"]*)"/)[1];
                augustVehiclesInIndex.add(vehicle);
            });
        }
        
        console.log(`📊 Unique vehicles in August 2025 index.ts: ${augustVehiclesInIndex.size}`);
        
        // Find vehicles that are in monthly data but not in index.ts
        const missingVehicles = [];
        vehiclesInMonthlyData.forEach(vehicle => {
            if (!augustVehiclesInIndex.has(vehicle)) {
                missingVehicles.push(vehicle);
            }
        });
        
        console.log(`\n❌ Missing vehicles: ${missingVehicles.length}`);
        
        if (missingVehicles.length > 0) {
            console.log('\n📋 Missing vehicles list:');
            missingVehicles.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
            
            // Show sample data for first few missing vehicles
            console.log('\n📊 Sample data for first 3 missing vehicles:');
            const sampleMissing = missingVehicles.slice(0, 3);
            
            sampleMissing.forEach(vehicle => {
                const vehicleRecords = monthlyData.filter(record => record.Vehicle === vehicle);
                console.log(`\n${vehicle}:`);
                console.log(`  Total records: ${vehicleRecords.length}`);
                if (vehicleRecords.length > 0) {
                    console.log(`  Sample dates: ${vehicleRecords.slice(0, 3).map(r => r.Date.split(' ')[0]).join(', ')}`);
                    console.log(`  Sample missed checkpoints: ${vehicleRecords.slice(0, 3).map(r => r['Missed Checkpoints']).join(', ')}`);
                }
            });
        }
        
        // Also check the reverse - vehicles in index.ts but not in monthly data
        const extraVehicles = [];
        augustVehiclesInIndex.forEach(vehicle => {
            if (!vehiclesInMonthlyData.has(vehicle)) {
                extraVehicles.push(vehicle);
            }
        });
        
        console.log(`\n➕ Extra vehicles in index.ts (not in monthly data): ${extraVehicles.length}`);
        if (extraVehicles.length > 0 && extraVehicles.length < 10) {
            console.log('📋 Extra vehicles:');
            extraVehicles.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        }
        
        console.log('\n✅ Missing vehicles check completed!');
        
    } catch (error) {
        console.error('❌ Error checking missing vehicles:', error.message);
    }
}

checkMissingAugustVehicles();