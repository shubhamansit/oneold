const fs = require('fs');

try {
  console.log('=== REGENERATING MONTHLY DATA WITH CORRECT MISSED CHECKPOINTS ===');
  
  // Load the correct missed checkpoint data
  const missedData = JSON.parse(fs.readFileSync('GJ06BX0309_missedCheckpoints.json', 'utf8'));
  console.log('Loaded missed checkpoint data for months:', Object.keys(missedData));
  
  // Load vehicle template
  const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
  const targetVehicle = 'GJ 06 BX 0309  E-1 - truck';
  const template = templates.find(t => t.Vehicle === targetVehicle);
  
  if (!template) {
    console.log('❌ Vehicle template not found');
    return;
  }
  
  console.log('Found vehicle template');
  
  // Generate corrected monthly data
  const correctedMonthlyData = [];
  
  Object.keys(missedData).forEach(month => {
    const monthData = missedData[month];
    const year = 2025;
    const monthNum = parseInt(month);
    
    console.log(`\nProcessing month ${month} (${monthNum})`);
    
    monthData.forEach(dayData => {
      const day = dayData.day;
      const missedCheckpoints = dayData.missed;
      
      // Create date
      const date = new Date(year, monthNum - 1, day);
      const dateTimeStr = date.toISOString().replace('T', ' ').substring(0, 19);
      
      // Calculate times
      const startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);
      const startTimeStr = startTime.toISOString().replace('T', ' ').substring(0, 19);
      
      const endTime = new Date(date);
      endTime.setHours(18, 0, 0, 0);
      const endTimeStr = endTime.toISOString().replace('T', ' ').substring(0, 19);
      
      // Actual times (from template)
      const actualStartTime = template["Actual Start Time"];
      const actualEndTime = template["Actual End Time"];
      
      // Calculate checkpoints
      const plannedCheckpoints = template["Planned Checkpoints"];
      const visitedCheckpoints = plannedCheckpoints - missedCheckpoints;
      const delays = template["Delay"] || 0;
      const onTimeCheckpoints = visitedCheckpoints - delays;
      const completionPercentage = Math.round((visitedCheckpoints / plannedCheckpoints) * 100);
      
      // Create the record
      const record = {
        ...template,
        "Date": dateTimeStr,
        "Start Time": startTimeStr,
        "End Time": endTimeStr,
        "Actual Start Time": actualStartTime,
        "Actual End Time": actualEndTime,
        "On-Time": onTimeCheckpoints,
        "Early": template["Early"] || 0,
        "Delay": delays,
        "Total Visited Checkpoints": visitedCheckpoints,
        "Missed Checkpoints": missedCheckpoints,
        "Checkpoints Complete Status(%)": completionPercentage
      };
      
      correctedMonthlyData.push(record);
    });
    
    console.log(`Month ${month}: ${monthData.length} records generated`);
  });
  
  console.log(`\nTotal records generated: ${correctedMonthlyData.length}`);
  
  // Save the corrected data
  const outputFile = 'GJ06BX0309_Corrected_JanJun2025_Data.json';
  fs.writeFileSync(outputFile, JSON.stringify(correctedMonthlyData, null, 2));
  
  console.log(`✅ Corrected data saved to: ${outputFile}`);
  
  // Show sample records with missed checkpoints
  const recordsWithMissed = correctedMonthlyData.filter(record => record["Missed Checkpoints"] > 0);
  console.log(`\nRecords with missed checkpoints: ${recordsWithMissed.length}`);
  
  if (recordsWithMissed.length > 0) {
    console.log('\nSample records with missed checkpoints:');
    recordsWithMissed.slice(0, 5).forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Date: ${record.Date}`);
      console.log(`  Missed: ${record["Missed Checkpoints"]}`);
      console.log(`  Visited: ${record["Total Visited Checkpoints"]}`);
      console.log(`  Planned: ${record["Planned Checkpoints"]}`);
      console.log(`  Completion: ${record["Checkpoints Complete Status(%)"]}%`);
      console.log('');
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
} 