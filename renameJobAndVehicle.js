const fs = require('fs');
const path = require('path');

// Read the index.ts file
const indexPath = path.join(__dirname, 'data', 'index.ts');
const content = fs.readFileSync(indexPath, 'utf8');

console.log('Starting rename operation...');
console.log('Original file size:', content.length, 'characters');

// Create backup
const backupPath = path.join(__dirname, 'data', `index_backup_before_rename_${new Date().toISOString().replace(/[:.]/g, '-')}.ts`);
fs.writeFileSync(backupPath, content);
console.log('Backup created at:', backupPath);

// Perform the replacements
let modifiedContent = content;

// Replace job name: "02-09-0921" → "02-09-0132" (only for June 2025)
const jobNameRegex = /"Job Name":\s*"([^"]*02-09-0921[^"]*)"/g;
modifiedContent = modifiedContent.replace(jobNameRegex, (match, jobName, offset) => {
    // Check if this is in June 2025 data by looking for "2025-06" in the surrounding context
    const contextBefore = content.substring(Math.max(0, offset - 200), offset);
    const contextAfter = content.substring(offset, offset + 200);
    const fullContext = contextBefore + contextAfter;
    
    if (fullContext.includes('"2025-06"') || fullContext.includes('"Date": "2025-06')) {
        const newJobName = jobName.replace(/02-09-0921/g, '02-09-0132');
        return `"Job Name": "${newJobName}"`;
    }
    return match; // Keep original if not June 2025
});

// Replace vehicle: "GJ 06 BX 0921" → "GJ 04 GB 0132" (only for June 2025)
const vehicleRegex = /"Vehicle":\s*"([^"]*GJ 06 BX 0921[^"]*)"/g;
modifiedContent = modifiedContent.replace(vehicleRegex, (match, vehicle, offset) => {
    // Check if this is in June 2025 data by looking for "2025-06" in the surrounding context
    const contextBefore = content.substring(Math.max(0, offset - 200), offset);
    const contextAfter = content.substring(offset, offset + 200);
    const fullContext = contextBefore + contextAfter;
    
    if (fullContext.includes('"2025-06"') || fullContext.includes('"Date": "2025-06')) {
        const newVehicle = vehicle.replace(/GJ 06 BX 0921/g, 'GJ 04 GB 0132');
        return `"Vehicle": "${newVehicle}"`;
    }
    return match; // Keep original if not June 2025
});

// Count the changes
const jobNameMatches = (content.match(jobNameRegex) || []).length;
const vehicleMatches = (content.match(vehicleRegex) || []).length;

console.log(`Found ${jobNameMatches} job name matches to replace`);
console.log(`Found ${vehicleMatches} vehicle matches to replace`);

// Write the modified content back to the file
fs.writeFileSync(indexPath, modifiedContent);

console.log('Rename operation completed successfully!');
console.log('Modified file size:', modifiedContent.length, 'characters');
console.log('Changes made (June 2025 data only):');
console.log('- Job Name: "02-09-0921" → "02-09-0132"');
console.log('- Vehicle: "GJ 06 BX 0921" → "GJ 04 GB 0132"'); 