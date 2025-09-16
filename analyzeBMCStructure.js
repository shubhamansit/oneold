const fs = require('fs');

function analyzeBMCStructure() {
    console.log('🔍 Analyzing BMC structure around line 2517991...\n');
    
    try {
        // Read the file
        console.log('📁 Reading index.ts file...');
        const content = fs.readFileSync('data/index.ts', 'utf8');
        
        // Split into lines for easier manipulation
        const lines = content.split('\n');
        
        console.log(`📊 Total lines in file: ${lines.length}`);
        
        // Look at more context around the error
        const startLine = 2517980;
        const endLine = 2520000;
        
        console.log(`🔍 Examining lines ${startLine} to ${endLine}:`);
        
        for (let i = startLine - 1; i < Math.min(endLine, lines.length); i++) {
            const marker = i === 2517990 ? '❌' : '  ';
            console.log(`${marker} ${i + 1}: ${lines[i]}`);
        }
        
        // The issue is that we have:
        // Line 2517988: ],
        // Line 2517989: (empty line)
        // Line 2517990: {
        // Line 2517991: "Company": "BMC",
        
        // This suggests we have an array that ends with ], then an object that starts with {
        // But in JavaScript, we can't have an array element followed directly by an object property
        
        // The correct structure should be:
        // Line 2517988: ],
        // Line 2517990: {
        // Line 2517991: "Company": "BMC",
        
        // OR we need to understand what the proper structure should be
        
        console.log('\n🔍 Looking for the opening structure...');
        
        // Look backwards to find the opening of this structure
        for (let i = 2517980; i >= 2517900; i--) {
            const line = lines[i];
            if (line.includes('"more_details"') || line.includes('[') || line.includes('{')) {
                console.log(`   ${i + 1}: ${line}`);
                break;
            }
        }
        
        console.log('\n🔍 Looking for the closing structure...');
        
        // Look forwards to find the closing of this structure
        for (let i = 2518000; i < Math.min(2518100, lines.length); i++) {
            const line = lines[i];
            if (line.includes(']') || line.includes('}') || line.includes('"more_details"')) {
                console.log(`   ${i + 1}: ${line}`);
                break;
            }
        }
        
        console.log('\n✅ BMC structure analysis completed!');
        
    } catch (error) {
        console.error('❌ Error analyzing BMC structure:', error.message);
    }
}

analyzeBMCStructure();