const fs = require('fs');

function fixDataStructureIssues() {
    console.log('🔍 Fixing data structure issues...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        let indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        console.log(`📊 Original file size: ${indexContent.length} characters`);
        
        // Fix 1: Correct planned checkpoints from 24 to 44 for August 2025 records
        console.log('\n🔧 Fixing planned checkpoints...');
        
        const beforePlanned = (indexContent.match(/"Planned Checkpoints": 24/g) || []).length;
        console.log(`📊 Records with 24 planned checkpoints: ${beforePlanned}`);
        
        // Replace planned checkpoints 24 with 44 for August 2025 records
        indexContent = indexContent.replace(
            /"Date": "2025-08-(\d{2})[^}]*?"Planned Checkpoints": 24/g,
            (match) => match.replace(/"Planned Checkpoints": 24/, '"Planned Checkpoints": 44')
        );
        
        const afterPlanned = (indexContent.match(/"Planned Checkpoints": 24/g) || []).length;
        console.log(`📊 Records with 24 planned checkpoints after fix: ${afterPlanned}`);
        
        // Fix 2: Remove duplicate August 2025 records (keep only one per vehicle per date)
        console.log('\n🔧 Removing duplicate August 2025 records...');
        
        // Find all August 2025 records
        const augustRecords = [];
        const augustPattern = /"Date": "2025-08-(\d{2})[^}]*?"Vehicle":\s*"([^"]+)"[^}]*?"Missed Checkpoints":\s*(\d+)/g;
        let match;
        
        while ((match = augustPattern.exec(indexContent)) !== null) {
            const date = match[1];
            const vehicle = match[2];
            const missed = match[3];
            const fullMatch = match[0];
            
            augustRecords.push({
                date: date,
                vehicle: vehicle,
                missed: parseInt(missed),
                fullMatch: fullMatch,
                index: match.index
            });
        }
        
        console.log(`📊 Found ${augustRecords.length} August 2025 records`);
        
        // Group by vehicle and date, keep only the first occurrence
        const uniqueRecords = new Map();
        const duplicatesToRemove = [];
        
        augustRecords.forEach(record => {
            const key = `${record.vehicle}-${record.date}`;
            if (uniqueRecords.has(key)) {
                duplicatesToRemove.push(record);
            } else {
                uniqueRecords.set(key, record);
            }
        });
        
        console.log(`📊 Unique records: ${uniqueRecords.size}`);
        console.log(`📊 Duplicates to remove: ${duplicatesToRemove.length}`);
        
        // Remove duplicates (work backwards to maintain indices)
        duplicatesToRemove.sort((a, b) => b.index - a.index);
        
        let removedCount = 0;
        duplicatesToRemove.forEach(duplicate => {
            // Find the full record including the closing brace
            const startIndex = duplicate.index;
            const endIndex = indexContent.indexOf('}', startIndex) + 1;
            
            if (endIndex > startIndex) {
                const recordToRemove = indexContent.substring(startIndex, endIndex);
                
                // Remove the record and any trailing comma
                let beforeRecord = indexContent.substring(0, startIndex);
                let afterRecord = indexContent.substring(endIndex);
                
                // Remove trailing comma if present
                if (beforeRecord.endsWith(',')) {
                    beforeRecord = beforeRecord.slice(0, -1);
                }
                
                // Remove leading comma if present
                if (afterRecord.startsWith(',')) {
                    afterRecord = afterRecord.substring(1);
                }
                
                indexContent = beforeRecord + afterRecord;
                removedCount++;
            }
        });
        
        console.log(`📊 Removed ${removedCount} duplicate records`);
        
        // Fix 3: Ensure proper vehicle format consistency
        console.log('\n🔧 Fixing vehicle format consistency...');
        
        // Count vehicles with short format
        const shortVehiclePattern = /"Vehicle":\s*"GJ\d{2}[A-Z]{2}\d{4}"/g;
        const shortVehicles = (indexContent.match(shortVehiclePattern) || []).length;
        console.log(`📊 Vehicles with short format: ${shortVehicles}`);
        
        // For now, let's keep both formats but ensure they're consistent
        // The application should handle both formats
        
        // Write the fixed content
        console.log('\n💾 Writing fixed data...');
        fs.writeFileSync('data/index.ts', indexContent);
        
        console.log(`📊 Final file size: ${indexContent.length} characters`);
        
        // Verify the fixes
        console.log('\n✅ Verifying fixes...');
        
        const finalAugustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Final August 2025 records: ${finalAugustRecords}`);
        
        const finalPlanned24 = (indexContent.match(/"Planned Checkpoints": 24/g) || []).length;
        console.log(`📊 Records with 24 planned checkpoints: ${finalPlanned24}`);
        
        const finalPlanned44 = (indexContent.match(/"Planned Checkpoints": 44/g) || []).length;
        console.log(`📊 Records with 44 planned checkpoints: ${finalPlanned44}`);
        
        console.log('\n🎉 Data structure fixes completed!');
        
    } catch (error) {
        console.error('❌ Error fixing data structure:', error.message);
    }
}

fixDataStructureIssues();