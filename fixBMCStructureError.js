const fs = require('fs');

function fixBMCStructureError() {
    console.log('🔧 Fixing BMC structure error around line 2517991...\n');
    
    try {
        // Read the file
        console.log('📁 Reading index.ts file...');
        const content = fs.readFileSync('data/index.ts', 'utf8');
        
        // Split into lines for easier manipulation
        const lines = content.split('\n');
        
        console.log(`📊 Total lines in file: ${lines.length}`);
        
        // The error is around line 2517991
        const targetLineIndex = 2517990; // 0-based index
        
        console.log(`🔍 Examining lines around ${targetLineIndex + 1}:`);
        
        // Show context
        for (let i = Math.max(0, targetLineIndex - 5); i <= Math.min(lines.length - 1, targetLineIndex + 5); i++) {
            const marker = i === targetLineIndex ? '❌' : '  ';
            console.log(`${marker} ${i + 1}: ${lines[i]}`);
        }
        
        // The issue is:
        // Line 2517988: ]
        // Line 2517989: ,
        // Line 2517990: {
        // Line 2517991: "Company": "BMC",
        
        // This is invalid JavaScript syntax. We need to fix the structure.
        // The correct structure should be:
        // Line 2517988: ],
        // Line 2517989: {
        // Line 2517990: "Company": "BMC",
        
        console.log('\n🔍 Fixing the structure...');
        
        // Fix line 2517988 - add comma after ]
        const bracketLineIndex = 2517987; // Line 2517988
        if (bracketLineIndex < lines.length) {
            const bracketLine = lines[bracketLineIndex];
            if (bracketLine.trim() === ']' || bracketLine.trim().endsWith(']')) {
                console.log(`❌ Found "]" without comma at line ${bracketLineIndex + 1}`);
                lines[bracketLineIndex] = bracketLine.trim() + ',';
                console.log(`✅ Fixed line ${bracketLineIndex + 1}: "${lines[bracketLineIndex]}"`);
            }
        }
        
        // Remove the standalone comma line 2517989
        const commaLineIndex = 2517988; // Line 2517989
        if (commaLineIndex < lines.length) {
            const commaLine = lines[commaLineIndex];
            if (commaLine.trim() === ',') {
                console.log(`❌ Found standalone comma at line ${commaLineIndex + 1}`);
                lines[commaLineIndex] = ''; // Remove the line
                console.log(`✅ Removed standalone comma from line ${commaLineIndex + 1}`);
            }
        }
        
        // Write the fixed content
        const fixedContent = lines.join('\n');
        fs.writeFileSync('data/index.ts', fixedContent);
        
        console.log('✅ Successfully fixed the BMC structure error!');
        
        console.log('\n✅ BMC structure fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing BMC structure:', error.message);
    }
}

fixBMCStructureError();