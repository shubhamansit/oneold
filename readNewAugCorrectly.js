const fs = require('fs');
const XLSX = require('xlsx');

function readNewAugCorrectly() {
    console.log('🔍 Reading new aug.xlsx correctly...\n');
    
    try {
        // Read the Excel file
        console.log('📁 Reading new aug.xlsx...');
        const workbook = XLSX.readFile('new aug.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays to better understand the structure
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`📊 Total rows in Excel: ${rawData.length}`);
        
        // Show first few rows to understand structure
        console.log('\n📊 First 5 rows of Excel data:');
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
            console.log(`Row ${i + 1}:`, rawData[i]);
        }
        
        // The structure seems to be:
        // Row 1: Headers (2025, 08 AUG, 1, 2, 3, ..., 31, TOTAL)
        // Row 2+: Vehicle data (VEHICLE, RUTE, missed checkpoints for each day)
        
        // Extract vehicles (skip header row)
        const vehicles = [];
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row[0] && row[0] !== 'VEHICLE') {
                const vehicle = row[0];
                if (vehicle && typeof vehicle === 'string' && vehicle.trim() !== '') {
                    vehicles.push(vehicle.trim());
                }
            }
        }
        
        console.log(`\n📊 Found ${vehicles.length} vehicles in Excel:`);
        vehicles.forEach((vehicle, index) => {
            console.log(`${index + 1}. ${vehicle}`);
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
        vehicles.forEach(excelVehicle => {
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
                missingVehicles.push(excelVehicle);
            }
        });
        
        console.log(`\n❌ Missing vehicles: ${missingVehicles.length}`);
        
        if (missingVehicles.length > 0) {
            console.log('\n📋 Missing vehicles list:');
            missingVehicles.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
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
        console.error('❌ Error reading new aug.xlsx:', error.message);
    }
}

readNewAugCorrectly();