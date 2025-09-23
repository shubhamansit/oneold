const fs = require('fs');

function checkAugustDataStructure() {
    console.log('🔍 Checking August 2025 data structure...\n');
    
    try {
        // Read the main index.ts file
        console.log('📁 Reading data/index.ts...');
        const indexContent = fs.readFileSync('data/index.ts', 'utf8');
        
        // Count total August 2025 records
        const augustRecords = (indexContent.match(/"Date": "2025-08-/g) || []).length;
        console.log(`📊 Total August 2025 records: ${augustRecords}`);
        
        // Find the first few August 2025 records to see the structure
        const augustPattern = /"Date": "2025-08-(\d{2})"/g;
        let match;
        let count = 0;
        
        console.log('\n📋 First 5 August 2025 records:');
        while ((match = augustPattern.exec(indexContent)) !== null && count < 5) {
            const dateIndex = match.index;
            const start = Math.max(0, dateIndex - 200);
            const end = Math.min(indexContent.length, dateIndex + 500);
            const record = indexContent.substring(start, end);
            
            console.log(`\n--- Record ${count + 1} ---`);
            console.log(record);
            
            count++;
        }
        
        // Check if there are any syntax issues around August data
        console.log('\n🔍 Checking for syntax issues...');
        
        // Look for common syntax problems
        const syntaxIssues = [];
        
        // Check for missing commas before August records
        const missingCommaPattern = /}\s*{\s*"Date": "2025-08-/g;
        let commaMatch;
        while ((commaMatch = missingCommaPattern.exec(indexContent)) !== null) {
            syntaxIssues.push(`Missing comma at position ${commaMatch.index}`);
        }
        
        // Check for malformed brackets
        const bracketPattern = /]\s*{\s*"Date": "2025-08-/g;
        let bracketMatch;
        while ((bracketMatch = bracketPattern.exec(indexContent)) !== null) {
            syntaxIssues.push(`Malformed bracket at position ${bracketMatch.index}`);
        }
        
        if (syntaxIssues.length > 0) {
            console.log(`❌ Found ${syntaxIssues.length} syntax issues:`);
            syntaxIssues.slice(0, 10).forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        } else {
            console.log('✅ No obvious syntax issues found');
        }
        
        // Check the end of the file to see how August data was appended
        console.log('\n📋 Last 1000 characters of the file:');
        const lastPart = indexContent.substring(Math.max(0, indexContent.length - 1000));
        console.log(lastPart);
        
        console.log('\n✅ Structure check completed!');
        
    } catch (error) {
        console.error('❌ Error checking structure:', error.message);
    }
}

checkAugustDataStructure();