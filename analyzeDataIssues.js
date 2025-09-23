const fs = require('fs');

function analyzeDataIssues() {
    console.log('🔍 Analyzing data structure issues...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Find all August 2025 records and analyze their structure
        const augustSections = indexContent.split(/"Date": "2025-08-/);
        
        console.log(`📊 Found ${augustSections.length - 1} August sections`);
        
        // Analyze the first few August records
        console.log('\n📋 Analyzing first 5 August records:');
        
        for (let i = 1; i <= Math.min(5, augustSections.length - 1); i++) {
            const section = augustSections[i];
            
            console.log(`\n--- August Record ${i} ---`);
            
            // Extract key fields
            const vehicleMatch = section.match(/"Vehicle":\s*"([^"]+)"/);
            const dateMatch = section.match(/^(\d{2})"/);
            const missedMatch = section.match(/"Missed Checkpoints":\s*(\d+)/);
            const plannedMatch = section.match(/"Planned Checkpoints":\s*(\d+)/);
            
            if (vehicleMatch) {
                console.log(`Vehicle: ${vehicleMatch[1]}`);
            }
            if (dateMatch) {
                console.log(`Date: 2025-08-${dateMatch[1]}`);
            }
            if (plannedMatch) {
                console.log(`Planned Checkpoints: ${plannedMatch[1]}`);
            }
            if (missedMatch) {
                console.log(`Missed Checkpoints: ${missedMatch[1]}`);
            }
            
            // Check for data inconsistencies
            const issues = [];
            
            // Check if vehicle format is consistent
            if (vehicleMatch) {
                const vehicle = vehicleMatch[1];
                if (vehicle.length < 10) {
                    issues.push(`Short vehicle format: ${vehicle}`);
                }
                if (!vehicle.includes('GJ')) {
                    issues.push(`Missing GJ prefix: ${vehicle}`);
                }
            }
            
            // Check if planned checkpoints is reasonable
            if (plannedMatch) {
                const planned = parseInt(plannedMatch[1]);
                if (planned !== 44) {
                    issues.push(`Unexpected planned checkpoints: ${planned} (expected 44)`);
                }
            }
            
            // Check if missed checkpoints is reasonable
            if (missedMatch && plannedMatch) {
                const missed = parseInt(missedMatch[1]);
                const planned = parseInt(plannedMatch[1]);
                if (missed > planned) {
                    issues.push(`Missed checkpoints (${missed}) > planned (${planned})`);
                }
            }
            
            if (issues.length > 0) {
                console.log(`❌ Issues found:`);
                issues.forEach(issue => console.log(`   - ${issue}`));
            } else {
                console.log(`✅ No issues found`);
            }
        }
        
        // Check for specific problematic patterns
        console.log('\n🔍 Checking for problematic patterns...');
        
        // Check for vehicles with very short names
        const shortVehicles = [];
        const vehiclePattern = /"Vehicle":\s*"([^"]+)"/g;
        let match;
        
        while ((match = vehiclePattern.exec(indexContent)) !== null) {
            const vehicle = match[1];
            if (vehicle.length < 15) {
                shortVehicles.push(vehicle);
            }
        }
        
        console.log(`📊 Vehicles with short names (< 15 chars): ${shortVehicles.length}`);
        if (shortVehicles.length > 0) {
            console.log('📋 Sample short vehicles:');
            shortVehicles.slice(0, 10).forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        }
        
        // Check for vehicles with numeric IDs only
        const numericVehicles = [];
        const numericPattern = /"Vehicle":\s*"(\d+)"/g;
        let numericMatch;
        
        while ((numericMatch = numericPattern.exec(indexContent)) !== null) {
            numericVehicles.push(numericMatch[1]);
        }
        
        console.log(`📊 Vehicles with numeric IDs only: ${numericVehicles.length}`);
        if (numericVehicles.length > 0) {
            console.log('📋 Numeric vehicles:');
            numericVehicles.slice(0, 10).forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle}`);
            });
        }
        
        // Check for duplicate vehicle entries
        const allVehicles = [];
        const allVehiclePattern = /"Vehicle":\s*"([^"]+)"/g;
        let allMatch;
        
        while ((allMatch = allVehiclePattern.exec(indexContent)) !== null) {
            allVehicles.push(allMatch[1]);
        }
        
        const vehicleCounts = {};
        allVehicles.forEach(vehicle => {
            vehicleCounts[vehicle] = (vehicleCounts[vehicle] || 0) + 1;
        });
        
        const duplicates = Object.entries(vehicleCounts).filter(([vehicle, count]) => count > 1);
        console.log(`📊 Vehicles with duplicate entries: ${duplicates.length}`);
        
        if (duplicates.length > 0) {
            console.log('📋 Sample duplicates:');
            duplicates.slice(0, 10).forEach(([vehicle, count]) => {
                console.log(`${vehicle}: ${count} entries`);
            });
        }
        
        console.log('\n✅ Data analysis completed!');
        
    } catch (error) {
        console.error('❌ Error analyzing data:', error.message);
    }
}

analyzeDataIssues();