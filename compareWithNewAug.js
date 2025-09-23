const fs = require('fs');
const XLSX = require('xlsx');

function compareWithNewAug() {
    console.log('🔍 Comparing with new aug.xlsx file...\n');
    
    try {
        // Read the new Excel file
        console.log('📁 Reading new aug.xlsx...');
        const workbook = XLSX.readFile('new aug.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📊 Total rows in new aug.xlsx: ${excelData.length}`);
        
        // Extract vehicles from Excel
        const excelVehicles = new Set();
        excelData.forEach(row => {
            // Assuming the vehicle column is one of the first few columns
            const vehicle = row['Vehicle'] || row['VEHICLE'] || row['vehicle'] || 
                          row['Route'] || row['ROUTE'] || row['route'] ||
                          Object.values(row)[0]; // First column if no standard name
            if (vehicle) {
                excelVehicles.add(String(vehicle).trim());
            }
        });
        
        console.log(`📊 Unique vehicles in Excel: ${excelVehicles.size}`);
        
        // Read our monthly data
        console.log('📁 Reading monthlyData_2025_08.json...');
        const monthlyData = JSON.parse(fs.readFileSync('monthlyData_2025_08.json', 'utf8'));
        
        // Get vehicles from our monthly data
        const ourVehicles = new Set();
        monthlyData.forEach(record => {
            ourVehicles.add(record.Vehicle);
        });
        
        console.log(`📊 Unique vehicles in our monthly data: ${ourVehicles.size}`);
        
        // Find missing vehicles (in Excel but not in our data)
        const missingVehicles = [];
        excelVehicles.forEach(excelVehicle => {
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
        
        // Find extra vehicles (in our data but not in Excel)
        const extraVehicles = [];
        ourVehicles.forEach(ourVehicle => {
            let found = false;
            
            for (const excelVehicle of excelVehicles) {
                // Try different matching strategies
                if (ourVehicle === excelVehicle ||
                    ourVehicle.replace(/\s/g, '') === excelVehicle.replace(/\s/g, '') ||
                    ourVehicle.includes(excelVehicle) || excelVehicle.includes(ourVehicle)) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                extraVehicles.push(ourVehicle);
            }
        });
        
        console.log(`\n➕ Extra vehicles in our data: ${extraVehicles.length}`);
        if (extraVehicles.length > 0 && extraVehicles.length < 20) {
            console.log('📋 Extra vehicles:');
            extraVehicles.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        }
        
        // Show sample Excel data structure
        console.log('\n📊 Sample Excel data structure:');
        if (excelData.length > 0) {
            const sampleRow = excelData[0];
            console.log('Column names:', Object.keys(sampleRow));
            console.log('Sample row:', sampleRow);
        }
        
        console.log('\n✅ Comparison completed!');
        
    } catch (error) {
        console.error('❌ Error comparing with new aug.xlsx:', error.message);
    }
}

compareWithNewAug();