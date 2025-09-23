const fs = require('fs');
const XLSX = require('xlsx');

function extractVehiclesFromNewAug() {
    console.log('🔍 Extracting vehicles from new aug.xlsx...\n');
    
    try {
        // Read the Excel file
        console.log('📁 Reading new aug.xlsx...');
        const workbook = XLSX.readFile('new aug.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`📊 Total rows in Excel: ${rawData.length}`);
        
        // Extract vehicles (skip header rows)
        const vehicles = [];
        for (let i = 2; i < rawData.length; i++) { // Start from row 3 (index 2)
            const row = rawData[i];
            if (row && row.length >= 3) {
                const route = row[1]; // Column 2: Route
                const vehicle = row[2]; // Column 3: Vehicle ID
                
                if (vehicle && typeof vehicle === 'string' && vehicle.trim() !== '') {
                    vehicles.push({
                        route: route ? String(route).trim() : '',
                        vehicle: vehicle.trim()
                    });
                }
            }
        }
        
        console.log(`\n📊 Found ${vehicles.length} vehicles in Excel:`);
        vehicles.forEach((item, index) => {
            console.log(`${index + 1}. ${item.vehicle} (Route: ${item.route})`);
        });
        
        // Read our monthly data
        console.log('\n📁 Reading monthlyData_2025_08.json...');
        const monthlyData = JSON.parse(fs.readFileSync('monthlyData_2025_08.json', 'utf8'));
        
        // Get vehicles from our monthly data
        const ourVehicles = new Set();
        monthlyData.forEach(record => {
            ourVehicles.add(record.Vehicle);
        });
        
        console.log(`📊 Unique vehicles in our monthly data: ${ourVehicles.size}`);
        
        // Find missing vehicles
        const missingVehicles = [];
        vehicles.forEach(excelItem => {
            const excelVehicle = excelItem.vehicle;
            let found = false;
            
            // Try different matching strategies
            for (const ourVehicle of ourVehicles) {
                // Exact match
                if (ourVehicle === excelVehicle) {
                    found = true;
                    break;
                }
                
                // Remove spaces and compare
                if (ourVehicle.replace(/\s/g, '') === excelVehicle.replace(/\s/g, '')) {
                    found = true;
                    break;
                }
                
                // Check if one contains the other
                if (ourVehicle.includes(excelVehicle) || excelVehicle.includes(ourVehicle)) {
                    found = true;
                    break;
                }
                
                // Check for partial matches (first part of vehicle ID)
                const excelId = excelVehicle.split(' ')[0];
                const ourId = ourVehicle.split(' ')[0];
                if (excelId && ourId && excelId === ourId) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                missingVehicles.push(excelItem);
            }
        });
        
        console.log(`\n❌ Missing vehicles: ${missingVehicles.length}`);
        
        if (missingVehicles.length > 0) {
            console.log('\n📋 Missing vehicles list:');
            missingVehicles.forEach((item, index) => {
                console.log(`${index + 1}. ${item.vehicle} (Route: ${item.route})`);
            });
        }
        
        // Show some of our vehicles for comparison
        console.log('\n📋 Sample of our vehicles:');
        const ourVehiclesArray = Array.from(ourVehicles);
        ourVehiclesArray.slice(0, 10).forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle}`);
        });
        
        console.log('\n✅ Analysis completed!');
        
    } catch (error) {
        console.error('❌ Error extracting vehicles:', error.message);
    }
}

extractVehiclesFromNewAug();