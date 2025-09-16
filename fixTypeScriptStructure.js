const fs = require('fs');

function fixTypeScriptStructure() {
    console.log('🔧 Fixing TypeScript structure in data/index.ts...\n');
    
    try {
        // Read the file
        console.log('📁 Reading index.ts file...');
        const content = fs.readFileSync('data/index.ts', 'utf8');
        
        console.log(`📊 File size: ${(content.length / 1024 / 1024).toFixed(2)} MB`);
        
        // Check if the file already has proper export structure
        if (content.trim().startsWith('export const')) {
            console.log('✅ File already has proper export structure');
            return;
        }
        
        // The file likely starts with raw JSON-like syntax
        // We need to wrap it in a proper TypeScript export
        
        console.log('🔍 Checking file structure...');
        
        // Look at the first few lines
        const lines = content.split('\n');
        console.log('First 5 lines:');
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        
        // Look at the last few lines
        console.log('\nLast 5 lines:');
        for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
        
        // The file should be structured as:
        // export const data = [
        //   ... existing content ...
        // ];
        
        console.log('\n🔧 Fixing TypeScript structure...');
        
        // Remove any existing export statements or semicolons at the end
        let fixedContent = content.trim();
        
        // Remove trailing semicolon if present
        if (fixedContent.endsWith(';')) {
            fixedContent = fixedContent.slice(0, -1);
        }
        
        // Remove any existing export statements
        fixedContent = fixedContent.replace(/^export\s+const\s+\w+\s*=\s*/, '');
        
        // Wrap in proper TypeScript export
        const finalContent = `export const data = ${fixedContent};`;
        
        // Write the fixed content
        fs.writeFileSync('data/index.ts', finalContent);
        
        console.log('✅ Successfully fixed TypeScript structure!');
        console.log('📊 New file size: ' + (finalContent.length / 1024 / 1024).toFixed(2) + ' MB');
        
        console.log('\n✅ TypeScript structure fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing TypeScript structure:', error.message);
    }
}

fixTypeScriptStructure();