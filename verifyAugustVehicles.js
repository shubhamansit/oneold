const fs = require('fs');
const XLSX = require('xlsx');

function verifyAugustVehicles() {
    console.log('🔍 Verifying August 2025 vehicles in the system...\n');
    
    try {
        // Read the Excel file to get the expected vehicles
        console.log('📁 Reading new aug.xlsx...');
        const workbook = XLSX.readFile('new aug.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const expectedVehicles = [];
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.length >= 3) {
                const vehicle = row[2];
                const route = row[1];
                if (vehicle && typeof vehicle === 'string' && vehicle.trim() !== '') {
                    expectedVehicles.push({
                        vehicle: vehicle.trim(),
                        route: route ? String(route).trim() : ''
                    });
                }
            }
        }
        
        console.log(`📊 Expected vehicles from Excel: ${expectedVehicles.length}`);
        
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Count total August 2025 records
        const augustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Total August 2025 records in index.ts: ${augustRecords}`);
        
        // Find all vehicles with August 2025 data
        const vehiclesWithAugustData = new Set();
        const augustPattern = /"Date": "2025-08-(\d{2})"/g;
        const vehiclePattern = /"Vehicle":\s*"([^"]+)"/g;
        
        let match;
        let currentIndex = 0;
        
        // Find all August 2025 records and their vehicles
        while ((match = augustPattern.exec(indexContent)) !== null) {
            const dateIndex = match.index;
            const beforeDate = indexContent.substring(Math.max(0, dateIndex - 500), dateIndex);
            const afterDate = indexContent.substring(dateIndex, dateIndex + 500);
            const searchArea = beforeDate + afterDate;
            
            const vehicleMatch = vehiclePattern.exec(searchArea);
            if (vehicleMatch) {
                vehiclesWithAugustData.add(vehicleMatch[1]);
            }
            vehiclePattern.lastIndex = 0;
        }
        
        console.log(`📊 Unique vehicles with August 2025 data: ${vehiclesWithAugustData.size}`);
        
        // Check which expected vehicles are missing
        const missingVehicles = [];
        const foundVehicles = [];
        
        expectedVehicles.forEach(expected => {
            let found = false;
            for (const existingVehicle of vehiclesWithAugustData) {
                if (existingVehicle === expected.vehicle ||
                    existingVehicle.replace(/\s/g, '') === expected.vehicle.replace(/\s/g, '') ||
                    existingVehicle.includes(expected.vehicle) || expected.vehicle.includes(existingVehicle)) {
                    found = true;
                    foundVehicles.push({
                        expected: expected.vehicle,
                        found: existingVehicle,
                        route: expected.route
                    });
                    break;
                }
            }
            if (!found) {
                missingVehicles.push(expected);
            }
        });
        
        console.log(`\n✅ Found vehicles: ${foundVehicles.length}`);
        console.log(`❌ Missing vehicles: ${missingVehicles.length}`);
        
        if (missingVehicles.length > 0) {
            console.log('\n📋 Missing vehicles:');
            missingVehicles.forEach((item, index) => {
                console.log(`${index + 1}. ${item.vehicle} (Route: ${item.route})`);
            });
        }
        
        if (foundVehicles.length > 0) {
            console.log('\n📋 Found vehicles (first 10):');
            foundVehicles.slice(0, 10).forEach((item, index) => {
                console.log(`${index + 1}. Expected: ${item.expected} | Found: ${item.found} (Route: ${item.route})`);
            });
        }
        
        // Check for specific vehicles mentioned
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
        
        // Show sample of vehicles with August data
        console.log('\n📋 Sample vehicles with August 2025 data:');
        const vehiclesArray = Array.from(vehiclesWithAugustData);
        vehiclesArray.slice(0, 10).forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle}`);
        });
        
        console.log('\n✅ Verification completed!');
        
    } catch (error) {
        console.error('❌ Error verifying vehicles:', error.message);
    }
}

verifyAugustVehicles();