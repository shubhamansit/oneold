const fs = require('fs');

function debugAugustData() {
    console.log('🔍 Debugging August 2025 data...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Find the first August 2025 record
        const firstAugustIndex = indexContent.indexOf('"Date": "2025-08-');
        if (firstAugustIndex === -1) {
            console.log('❌ No August 2025 records found');
            return;
        }
        
        console.log(`📊 First August record found at position: ${firstAugustIndex}`);
        
        // Get context around the first August record
        const start = Math.max(0, firstAugustIndex - 500);
        const end = Math.min(indexContent.length, firstAugustIndex + 1000);
        const context = indexContent.substring(start, end);
        
        console.log('\n📋 Context around first August record:');
        console.log(context);
        
        // Check if there are any syntax issues
        console.log('\n🔍 Checking for syntax issues...');
        
        // Look for the pattern that should contain Vehicle field
        const vehiclePattern = /"Vehicle":\s*"([^"]+)"/g;
        let vehicleMatch;
        let vehicleCount = 0;
        
        while ((vehicleMatch = vehiclePattern.exec(indexContent)) !== null && vehicleCount < 10) {
            const vehicleIndex = vehicleMatch.index;
            const vehicleContext = indexContent.substring(
                Math.max(0, vehicleIndex - 100), 
                Math.min(indexContent.length, vehicleIndex + 200)
            );
            
            console.log(`\n--- Vehicle ${vehicleCount + 1} ---`);
            console.log(`Vehicle: ${vehicleMatch[1]}`);
            console.log(`Context: ${vehicleContext}`);
            
            vehicleCount++;
        }
        
        // Check the end of the file to see the structure
        console.log('\n📋 Last 2000 characters of the file:');
        const lastPart = indexContent.substring(Math.max(0, indexContent.length - 2000));
        console.log(lastPart);
        
        console.log('\n✅ Debug completed!');
        
    } catch (error) {
        console.error('❌ Error debugging:', error.message);
    }
}

debugAugustData();