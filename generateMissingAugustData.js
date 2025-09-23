const fs = require('fs');
const XLSX = require('xlsx');

function generateMissingAugustData() {
    console.log('🔍 Generating missing August 2025 data...\n');
    
    try {
        // Read the new Excel file
        console.log('📁 Reading new aug.xlsx...');
        const workbook = XLSX.readFile('new aug.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`📊 Total rows in Excel: ${rawData.length}`);
        
        // Extract vehicles and their missed checkpoint data
        const vehiclesData = [];
        for (let i = 2; i < rawData.length; i++) { // Start from row 3 (index 2)
            const row = rawData[i];
            if (row && row.length >= 35) { // Ensure we have all columns
                const srNo = row[0];
                const route = row[1];
                const vehicle = row[2];
                
                if (vehicle && typeof vehicle === 'string' && vehicle.trim() !== '') {
                    const missedCheckpoints = [];
                    // Extract missed checkpoints for days 1-31 (columns 3-33)
                    for (let day = 1; day <= 31; day++) {
                        const missed = row[2 + day] || 0; // Column index 3-33
                        missedCheckpoints.push(parseInt(missed) || 0);
                    }
                    
                    vehiclesData.push({
                        srNo: srNo,
                        route: route ? String(route).trim() : '',
                        vehicle: vehicle.trim(),
                        missedCheckpoints: missedCheckpoints
                    });
                }
            }
        }
        
        console.log(`📊 Found ${vehiclesData.length} vehicles in Excel`);
        
        // Read our monthly data to see what we already have
        console.log('📁 Reading monthlyData_2025_08.json...');
        const monthlyData = JSON.parse(fs.readFileSync('monthlyData_2025_08.json', 'utf8'));
        
        // Get vehicles from our monthly data
        const ourVehicles = new Set();
        monthlyData.forEach(record => {
            ourVehicles.add(record.Vehicle);
        });
        
        console.log(`📊 Unique vehicles in our monthly data: ${ourVehicles.size}`);
        
        // Find missing vehicles
        const missingVehicles = [];
        vehiclesData.forEach(excelItem => {
            const excelVehicle = excelItem.vehicle;
            let found = false;
            
            // Try different matching strategies
            for (const ourVehicle of ourVehicles) {
                if (ourVehicle === excelVehicle ||
                    ourVehicle.replace(/\s/g, '') === excelVehicle.replace(/\s/g, '') ||
                    ourVehicle.includes(excelVehicle) || excelVehicle.includes(ourVehicle)) {
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
            
            // Generate monthly data for missing vehicles
            console.log('\n🔄 Generating monthly data for missing vehicles...');
            
            const newRecords = [];
            missingVehicles.forEach(item => {
                const { vehicle, route, missedCheckpoints } = item;
                
                // Generate 31 days of data for August 2025
                for (let day = 1; day <= 31; day++) {
                    const dateStr = `2025-08-${day.toString().padStart(2, '0')}`;
                    const missedCount = missedCheckpoints[day - 1] || 0;
                    
                    // Create a record similar to existing structure
                    const record = {
                        "Date": `${dateStr} 23:30:00`,
                        "Vehicle": vehicle,
                        "Start Time": `${dateStr} 00:00:00`,
                        "End Time": `${dateStr} 18:00:00`,
                        "Actual Start Time": `${dateStr} 05:30:00`,
                        "Actual End Time": `${dateStr} 11:30:00`,
                        "Planned Checkpoints": 44,
                        "On-Time": 44 - missedCount,
                        "Early": 0,
                        "Delay": 0,
                        "Total Visited Checkpoints": 44 - missedCount,
                        "Missed Checkpoints": missedCount,
                        "Checkpoints Complete Status(%)": Math.round(((44 - missedCount) / 44) * 100),
                        "Estimated Distance": 18,
                        "Distance": 36,
                        "Distance Completed %": 100,
                        "On Route": 36,
                        "On Route %": 100,
                        "Off Route": 0,
                        "Off Route %": 0,
                        "Early Arrival Condition(Minute)": "0:00",
                        "Delay Arrival Condition(Minute)": "0:00",
                        "Group Name": "--",
                        "Penalty": 0,
                        "Reason": "--",
                        "Remark": "--",
                        "Assigned": vehicle,
                        "Present": vehicle,
                        "Waste Weight": 0,
                        "Incidents": 0,
                        "avg_halt_time": "3:46"
                    };
                    
                    newRecords.push(record);
                }
            });
            
            console.log(`📊 Generated ${newRecords.length} new records for ${missingVehicles.length} vehicles`);
            
            // Append to existing monthly data
            const updatedMonthlyData = [...monthlyData, ...newRecords];
            
            // Write updated monthly data
            fs.writeFileSync('monthlyData_2025_08.json', JSON.stringify(updatedMonthlyData, null, 2));
            console.log('✅ Updated monthlyData_2025_08.json');
            
            // Now append to main index.ts file
            console.log('\n🔄 Appending to main index.ts file...');
            
            // Read the main index.ts file
            const content = fs.readFileSync('data/index.ts', 'utf8');
            
            // Find the insertion point (before the closing bracket)
            const insertionPoint = content.lastIndexOf(']');
            if (insertionPoint === -1) {
                throw new Error('Could not find insertion point in index.ts');
            }
            
            // Create the new records as a string
            const newRecordsString = newRecords.map(record => 
                JSON.stringify(record, null, 8)
            ).join(',\n');
            
            // Insert the new records
            const updatedContent = content.slice(0, insertionPoint) + 
                                 ',\n' + newRecordsString + 
                                 '\n' + content.slice(insertionPoint);
            
            // Write the updated content
            fs.writeFileSync('data/index.ts', updatedContent);
            console.log('✅ Updated data/index.ts');
            
            console.log(`\n🎉 Successfully added August 2025 data for ${missingVehicles.length} missing vehicles!`);
            console.log(`📊 Total new records added: ${newRecords.length}`);
        }
        
        console.log('\n✅ Missing August data generation completed!');
        
    } catch (error) {
        console.error('❌ Error generating missing August data:', error.message);
    }
}

generateMissingAugustData();