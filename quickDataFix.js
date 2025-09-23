const fs = require('fs');

function quickDataFix() {
    console.log('🔍 Quick data fix for August 2025 records...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        let indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        console.log(`📊 Original file size: ${(indexContent.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Fix 1: Correct planned checkpoints from 24 to 44 for August 2025 records only
        console.log('\n🔧 Fixing planned checkpoints for August 2025...');
        
        const beforePlanned = (indexContent.match(/"Planned Checkpoints": 24/g) || []).length;
        console.log(`📊 Records with 24 planned checkpoints: ${beforePlanned}`);
        
        // Use a more targeted replacement for August 2025 records
        indexContent = indexContent.replace(
            /"Date": "2025-08-\d{2}[^}]*?"Planned Checkpoints": 24/g,
            (match) => match.replace(/"Planned Checkpoints": 24/, '"Planned Checkpoints": 44')
        );
        
        const afterPlanned = (indexContent.match(/"Planned Checkpoints": 24/g) || []).length;
        console.log(`📊 Records with 24 planned checkpoints after fix: ${afterPlanned}`);
        console.log(`✅ Fixed ${beforePlanned - afterPlanned} planned checkpoint values`);
        
        // Fix 2: Remove the duplicate August records that were added incorrectly
        console.log('\n🔧 Removing duplicate August 2025 records...');
        
        // Find the insertion point where duplicates were added (look for the pattern)
        const duplicateStartPattern = /,\s*{\s*"Date": "2025-08-01 23:30:00",\s*"Vehicle": "GJ04GB0086"/;
        const duplicateStart = indexContent.search(duplicateStartPattern);
        
        if (duplicateStart !== -1) {
            console.log(`📊 Found duplicate records starting at position: ${duplicateStart}`);
            
            // Find the end of the duplicates (look for the closing bracket before the final closing bracket)
            const beforeDuplicates = indexContent.substring(0, duplicateStart);
            const afterDuplicates = indexContent.substring(duplicateStart);
            
            // Find the last closing bracket and remove everything from duplicate start to there
            const lastBracketIndex = afterDuplicates.lastIndexOf('}');
            if (lastBracketIndex !== -1) {
                const cleanAfterDuplicates = afterDuplicates.substring(lastBracketIndex + 1);
                
                // Reconstruct the file without duplicates
                indexContent = beforeDuplicates + cleanAfterDuplicates;
                
                console.log(`✅ Removed duplicate August 2025 records`);
            }
        } else {
            console.log(`❌ Could not find duplicate records pattern`);
        }
        
        // Write the fixed content
        console.log('\n💾 Writing fixed data...');
        fs.writeFileSync('data/index.ts', indexContent);
        
        console.log(`📊 Final file size: ${(indexContent.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Verify the fixes
        console.log('\n✅ Verifying fixes...');
        
        const finalAugustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Final August 2025 records: ${finalAugustRecords}`);
        
        const finalPlanned24 = (indexContent.match(/"Planned Checkpoints": 24/g) || []).length;
        console.log(`📊 Records with 24 planned checkpoints: ${finalPlanned24}`);
        
        const finalPlanned44 = (indexContent.match(/"Planned Checkpoints": 44/g) || []).length;
        console.log(`📊 Records with 44 planned checkpoints: ${finalPlanned44}`);
        
        // Check for specific vehicles
        const specificVehicles = ['GJ06BX0741', 'GJ06BX0761', 'GJ04GB0086'];
        console.log('\n🔍 Checking specific vehicles:');
        
        specificVehicles.forEach(vehicle => {
            const count = (indexContent.match(new RegExp(`"Vehicle":\\s*"[^"]*${vehicle}[^"]*"`, 'g')) || []).length;
            console.log(`📊 ${vehicle}: ${count} records`);
        });
        
        console.log('\n🎉 Quick data fix completed!');
        
    } catch (error) {
        console.error('❌ Error in quick data fix:', error.message);
    }
}

quickDataFix();