const fs = require('fs');

function checkForDuplicates() {
  try {
    console.log('🔍 Checking for duplicate October 2025 data across all zone files...\n');
    
    // Zone files to process
    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' }
    ];
    
    let totalDuplicatesFound = 0;
    
    // Process each zone file
    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\n🔄 Checking ${zoneName}...`);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        let duplicatesInFile = 0;
        const duplicateDetails = [];
        
        data.forEach(record => {
          if (record.more_details && Array.isArray(record.more_details)) {
            // Get all October 2025 records
            const octoberRecords = record.more_details.filter(detail => 
              detail.Date && detail.Date.startsWith('2025-10')
            );
            
            if (octoberRecords.length > 0) {
              // Check for duplicates by date
              const dateCounts = new Map();
              
              octoberRecords.forEach(octoberRecord => {
                const dateKey = octoberRecord.Date.split(' ')[0]; // YYYY-MM-DD
                
                if (!dateCounts.has(dateKey)) {
                  dateCounts.set(dateKey, []);
                }
                dateCounts.get(dateKey).push(octoberRecord);
              });
              
              // Find dates with multiple records
              dateCounts.forEach((records, dateKey) => {
                if (records.length > 1) {
                  duplicatesInFile += records.length - 1; // Keep one, remove the rest
                  duplicateDetails.push({
                    jobName: record["Job Name"],
                    date: dateKey,
                    count: records.length
                  });
                }
              });
            }
          }
        });
        
        if (duplicatesInFile > 0) {
          console.log(`  ⚠️  Found ${duplicatesInFile} duplicate October records`);
          console.log(`  📋 Sample duplicates:`);
          duplicateDetails.slice(0, 10).forEach(detail => {
            console.log(`     - "${detail.jobName}" on ${detail.date}: ${detail.count} records`);
          });
          if (duplicateDetails.length > 10) {
            console.log(`     ... and ${duplicateDetails.length - 10} more`);
          }
        } else {
          console.log(`  ✅ No duplicates found`);
        }
        
        totalDuplicatesFound += duplicatesInFile;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${zoneName}:`, error.message);
      }
    });
    
    console.log(`\n📊 DUPLICATE CHECK SUMMARY:`);
    console.log(`🗑️  Total duplicates found: ${totalDuplicatesFound}`);
    
    if (totalDuplicatesFound > 0) {
      console.log(`\n⚠️  Duplicates detected! Run removeDuplicateOctoberData.js to remove them.`);
    } else {
      console.log(`✅ No duplicates found across all zone files.`);
    }
    
    return totalDuplicatesFound;
    
  } catch (error) {
    console.error('❌ Error checking for duplicates:', error);
    return 0;
  }
}

// Run the function
if (require.main === module) {
  checkForDuplicates();
}

module.exports = { checkForDuplicates };

