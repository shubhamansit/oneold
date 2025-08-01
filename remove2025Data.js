const fs = require('fs');

function remove2025Data() {
  try {
    console.log('🧹 Removing all 2025 data from index.ts...');
    
    // Read the index.ts file
    const indexPath = 'data/index.ts';
    const content = fs.readFileSync(indexPath, 'utf8');
    console.log(`📁 Read index.ts file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Find all array exports
    const arrayMatches = content.matchAll(/export const ([a-zA-Z_]+) = \[([\s\S]*?)\];/g);
    const arrays = {};
    
    for (const match of arrayMatches) {
      const arrayName = match[1];
      const arrayContent = match[2];
      arrays[arrayName] = { content: arrayContent, match: match[0] };
    }
    
    // Process all arrays
    let updatedContent = content;
    let totalRemoved = 0;
    
    Object.entries(arrays).forEach(([arrayName, arrayInfo]) => {
      console.log(`\n🔄 Processing ${arrayName}...`);
      
      try {
        const data = eval(`([${arrayInfo.content}])`);
        console.log(`  Original records: ${data.length}`);
        
        // Remove 2025 data from each vehicle's more_details
        const updatedData = data.map(record => {
          const updatedRecord = { ...record };
          
          if (updatedRecord.more_details && Array.isArray(updatedRecord.more_details)) {
            // Keep only 2024 data (filter out 2025 data)
            const filteredDetails = updatedRecord.more_details.filter(detail => 
              !detail.Date || !detail.Date.startsWith('2025-')
            );
            
            const removedCount = updatedRecord.more_details.length - filteredDetails.length;
            if (removedCount > 0) {
              console.log(`    🗑️  Removed ${removedCount} 2025 records from vehicle: ${updatedRecord["Job Name"]}`);
              totalRemoved += removedCount;
            }
            
            updatedRecord.more_details = filteredDetails;
          }
          
          return updatedRecord;
        });
        
        // Replace the array in the content
        const newExport = `export const ${arrayName} = ${JSON.stringify(updatedData, null, 2)};`;
        updatedContent = updatedContent.replace(arrayInfo.match, newExport);
        console.log(`✅ Updated ${arrayName} array`);
        
      } catch (error) {
        console.error(`❌ Error processing ${arrayName}:`, error.message);
      }
    });
    
    // Create backup first
    const backupPath = `data/index_backup_before_removing_2025_${new Date().toISOString().replace(/[:.]/g, '-')}.ts`;
    fs.writeFileSync(backupPath, content);
    console.log(`💾 Created backup: ${backupPath}`);
    
    // Write updated file
    console.log(`📝 Writing updated file...`);
    fs.writeFileSync(indexPath, updatedContent);
    
    console.log(`\n📊 CLEANUP SUMMARY:`);
    console.log(`🗑️  Total 2025 records removed: ${totalRemoved}`);
    console.log(`📊 New file size: ${(updatedContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ All 2025 data successfully removed from index.ts`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error removing 2025 data:', error);
    return false;
  }
}

// Run the function
if (require.main === module) {
  remove2025Data();
}

module.exports = { remove2025Data }; 