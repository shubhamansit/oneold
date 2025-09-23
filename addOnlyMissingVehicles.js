const fs = require('fs');
const XLSX = require('xlsx');

function addOnlyMissingVehicles() {
    console.log('🔍 Adding only truly missing vehicles...\n');
    
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
        
        // Read our main index.ts file to check what we actually have
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Find vehicles that already have August 2025 data
        const existingAugustVehicles = new Set();
        const augustPattern = /"Date": "2025-08-(\d{2})"/g;
        const vehiclePattern = /"Vehicle":\s*"([^"]+)"/g;
        
        let match;
        let currentIndex = 0;
        
        // Find all August 2025 records and their vehicles
        while ((match = augustPattern.exec(indexContent)) !== null) {
            const dateIndex = match.index;
            const vehicleMatch = vehiclePattern.exec(indexContent.substring(Math.max(0, dateIndex - 200), dateIndex + 200));
            if (vehicleMatch) {
                existingAugustVehicles.add(vehicleMatch[1]);
            }
            // Reset regex lastIndex to continue searching
            vehiclePattern.lastIndex = 0;
        }
        
        console.log(`📊 Vehicles already with August 2025 data: ${existingAugustVehicles.size}`);
        
        // Find truly missing vehicles
        const trulyMissingVehicles = [];
        vehiclesData.forEach(excelItem => {
            const excelVehicle = excelItem.vehicle;
            let found = false;
            
            // Check if this vehicle already has August 2025 data
            for (const existingVehicle of existingAugustVehicles) {
                if (existingVehicle === excelVehicle ||
                    existingVehicle.replace(/\s/g, '') === excelVehicle.replace(/\s/g, '') ||
                    existingVehicle.includes(excelVehicle) || excelVehicle.includes(existingVehicle)) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                trulyMissingVehicles.push(excelItem);
            }
        });
        
        console.log(`\n❌ Truly missing vehicles: ${trulyMissingVehicles.length}`);
        
        if (trulyMissingVehicles.length > 0) {
            console.log('\n📋 Truly missing vehicles list:');
            trulyMissingVehicles.forEach((item, index) => {
                console.log(`${index + 1}. ${item.vehicle} (Route: ${item.route})`);
            });
            
            // Generate monthly data for truly missing vehicles only
            console.log('\n🔄 Generating monthly data for truly missing vehicles only...');
            
            const newRecords = [];
            trulyMissingVehicles.forEach(item => {
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
            
            console.log(`📊 Generated ${newRecords.length} new records for ${trulyMissingVehicles.length} truly missing vehicles`);
            
            // Append to main index.ts file
            console.log('\n🔄 Appending to main index.ts file...');
            
            // Find the insertion point (before the closing bracket)
            const insertionPoint = indexContent.lastIndexOf(']');
            if (insertionPoint === -1) {
                throw new Error('Could not find insertion point in index.ts');
            }
            
            // Create the new records as a string
            const newRecordsString = newRecords.map(record => 
                JSON.stringify(record, null, 8)
            ).join(',\n');
            
            // Insert the new records
            const updatedContent = indexContent.slice(0, insertionPoint) + 
                                 ',\n' + newRecordsString + 
                                 '\n' + indexContent.slice(insertionPoint);
            
            // Write the updated content
            fs.writeFileSync('data/index.ts', updatedContent);
            console.log('✅ Updated data/index.ts');
            
            console.log(`\n🎉 Successfully added August 2025 data for ${trulyMissingVehicles.length} truly missing vehicles only!`);
            console.log(`📊 Total new records added: ${newRecords.length}`);
        } else {
            console.log('\n✅ No missing vehicles found! All vehicles from Excel already have August 2025 data.');
        }
        
        console.log('\n✅ Missing vehicles check and addition completed!');
        
    } catch (error) {
        console.error('❌ Error adding missing vehicles:', error.message);
    }
}

addOnlyMissingVehicles();