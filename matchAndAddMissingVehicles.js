const fs = require('fs');
const XLSX = require('xlsx');

function matchAndAddMissingVehicles() {
    console.log('🔍 Matching and adding missing vehicles...\n');
    
    try {
        // Read the Excel file
        console.log('📁 Reading new aug.xlsx...');
        const workbook = XLSX.readFile('new aug.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const excelVehicles = [];
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.length >= 35) {
                const vehicle = row[2];
                const route = row[1];
                if (vehicle && typeof vehicle === 'string' && vehicle.trim() !== '') {
                    const missedCheckpoints = [];
                    for (let day = 1; day <= 31; day++) {
                        const missed = row[2 + day] || 0;
                        missedCheckpoints.push(parseInt(missed) || 0);
                    }
                    
                    excelVehicles.push({
                        vehicle: vehicle.trim(),
                        route: route ? String(route).trim() : '',
                        missedCheckpoints: missedCheckpoints
                    });
                }
            }
        }
        
        console.log(`📊 Excel vehicles: ${excelVehicles.length}`);
        
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Find all existing vehicles in the system
        const existingVehicles = new Set();
        const vehiclePattern = /"Vehicle":\s*"([^"]+)"/g;
        let match;
        
        while ((match = vehiclePattern.exec(indexContent)) !== null) {
            existingVehicles.add(match[1]);
        }
        
        console.log(`📊 Existing vehicles in system: ${existingVehicles.size}`);
        
        // Find vehicles that need to be added (from Excel but not in system)
        const vehiclesToAdd = [];
        excelVehicles.forEach(excelItem => {
            const excelVehicle = excelItem.vehicle;
            let found = false;
            
            // Try to match with existing vehicles
            for (const existingVehicle of existingVehicles) {
                // Extract the core vehicle ID (e.g., "GJ06BX0137" from "GJ 06 BX 0137 RUT 01-04-0137 - TRUCK")
                const coreId = existingVehicle.replace(/\s+/g, '').replace(/RUT.*$/, '');
                const excelCoreId = excelVehicle.replace(/\s+/g, '');
                
                if (coreId === excelCoreId || 
                    existingVehicle.includes(excelVehicle) || 
                    excelVehicle.includes(coreId)) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                vehiclesToAdd.push(excelItem);
            }
        });
        
        console.log(`\n❌ Vehicles to add: ${vehiclesToAdd.length}`);
        
        if (vehiclesToAdd.length > 0) {
            console.log('\n📋 Vehicles to add:');
            vehiclesToAdd.forEach((item, index) => {
                console.log(`${index + 1}. ${item.vehicle} (Route: ${item.route})`);
            });
            
            // Generate data for missing vehicles
            console.log('\n🔄 Generating data for missing vehicles...');
            
            const newRecords = [];
            vehiclesToAdd.forEach(item => {
                const { vehicle, route, missedCheckpoints } = item;
                
                // Create a proper vehicle name format
                const formattedVehicle = `GJ ${vehicle.substring(2, 4)} ${vehicle.substring(4, 6)} ${vehicle.substring(6)} RUT ${route} - TRUCK`;
                
                // Generate 31 days of data for August 2025
                for (let day = 1; day <= 31; day++) {
                    const dateStr = `2025-08-${day.toString().padStart(2, '0')}`;
                    const missedCount = missedCheckpoints[day - 1] || 0;
                    
                    const record = {
                        "Date": `${dateStr} 23:30:00`,
                        "Vehicle": formattedVehicle,
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
                        "Assigned": formattedVehicle,
                        "Present": formattedVehicle,
                        "Waste Weight": 0,
                        "Incidents": 0,
                        "avg_halt_time": "3:46"
                    };
                    
                    newRecords.push(record);
                }
            });
            
            console.log(`📊 Generated ${newRecords.length} new records for ${vehiclesToAdd.length} vehicles`);
            
            // Append to main index.ts file
            console.log('\n🔄 Appending to main index.ts file...');
            
            const insertionPoint = indexContent.lastIndexOf(']');
            if (insertionPoint === -1) {
                throw new Error('Could not find insertion point in index.ts');
            }
            
            const newRecordsString = newRecords.map(record => 
                JSON.stringify(record, null, 8)
            ).join(',\n');
            
            const updatedContent = indexContent.slice(0, insertionPoint) + 
                                 ',\n' + newRecordsString + 
                                 '\n' + indexContent.slice(insertionPoint);
            
            fs.writeFileSync('data/index.ts', updatedContent);
            console.log('✅ Updated data/index.ts');
            
            console.log(`\n🎉 Successfully added August 2025 data for ${vehiclesToAdd.length} missing vehicles!`);
            console.log(`📊 Total new records added: ${newRecords.length}`);
        } else {
            console.log('\n✅ All vehicles from Excel are already in the system!');
        }
        
        console.log('\n✅ Matching and addition completed!');
        
    } catch (error) {
        console.error('❌ Error matching and adding vehicles:', error.message);
    }
}

matchAndAddMissingVehicles();