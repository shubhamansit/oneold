const fs = require('fs');

try {
  console.log('=== CREATING FINAL ARRAY FOR MANUAL COPY-PASTE ===');
  
  // Load the corrected data
  const correctedData = JSON.parse(fs.readFileSync('GJ06BX0309_Corrected_JanJun2025_Data.json', 'utf8'));
  
  console.log(`Total records: ${correctedData.length}`);
  
  // Count records with missed checkpoints
  const recordsWithMissed = correctedData.filter(record => record["Missed Checkpoints"] > 0);
  console.log(`Records with missed checkpoints: ${recordsWithMissed.length}`);
  
  // Show summary by month
  const months = {};
  correctedData.forEach(record => {
    const month = record.Date.substring(5, 7);
    if (!months[month]) months[month] = { total: 0, missed: 0 };
    months[month].total++;
    if (record["Missed Checkpoints"] > 0) months[month].missed++;
  });
  
  console.log('\nSummary by month:');
  Object.keys(months).sort().forEach(month => {
    const data = months[month];
    console.log(`Month ${month}: ${data.total} records, ${data.missed} with missed checkpoints`);
  });
  
  // Create the final array for copy-paste
  console.log('\n=== FINAL ARRAY FOR COPY-PASTE ===');
  console.log('Copy the following array and paste it into your more_details:');
  console.log('\n' + JSON.stringify(correctedData, null, 2));
  
  // Also save to a file for easy access
  const outputFile = 'GJ06BX0309_FinalArray_ForCopyPaste.json';
  fs.writeFileSync(outputFile, JSON.stringify(correctedData, null, 2));
  console.log(`\n✅ Final array also saved to: ${outputFile}`);
  
  // Show some sample records with missed checkpoints
  console.log('\n=== SAMPLE RECORDS WITH MISSED CHECKPOINTS ===');
  recordsWithMissed.slice(0, 10).forEach((record, index) => {
    console.log(`Record ${index + 1}:`);
    console.log(`  Date: ${record.Date}`);
    console.log(`  Missed Checkpoints: ${record["Missed Checkpoints"]}`);
    console.log(`  Total Visited: ${record["Total Visited Checkpoints"]}`);
    console.log(`  Planned: ${record["Planned Checkpoints"]}`);
    console.log(`  Completion: ${record["Checkpoints Complete Status(%)"]}%`);
    console.log('');
  });
  
} catch (error) {
  console.error('Error:', error.message);
} 