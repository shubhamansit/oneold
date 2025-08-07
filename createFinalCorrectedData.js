const fs = require('fs');

try {
  console.log('=== CREATING FINAL CORRECTED DATA ===');
  
  // Load the correct day mapping data
  const missedData = JSON.parse(fs.readFileSync('GJ06BX0309_CorrectDayMapping.json', 'utf8'));
  console.log('Loaded correct day mapping data for months:', Object.keys(missedData));
  
  // Load vehicle template
  const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
  const targetVehicle = 'GJ 06 BX 0309  E-1 - truck';
  const template = templates.find(t => t.Vehicle === targetVehicle);
  
  if (!template) {
    console.log('❌ Vehicle template not found');
    return;
  }
  
  console.log('Found vehicle template');
  
  // Generate corrected monthly data with proper day mapping
  const correctedMonthlyData = [];
  
  Object.keys(missedData).forEach(month => {
    const monthData = missedData[month];
    const year = 2025;
    const monthNum = parseInt(month);
    
    console.log(`\nProcessing month ${month} (${monthNum})`);
    
    monthData.forEach(dayData => {
      const day = dayData.day;
      const missedCheckpoints = dayData.missed;
      
      // Create date with the correct day from Excel header
      const date = new Date(year, monthNum - 1, day);
      const dateStr = date.toISOString().split('T')[0]; // Just the date part YYYY-MM-DD
      
      // Calculate times - use 00:00:00 for start and 18:00:00 for end
      const startTimeStr = `${dateStr} 00:00:00`;
      const endTimeStr = `${dateStr} 18:00:00`;
      const dateTimeStr = `${dateStr} 18:00:00`; // Main date field
      
      // Extract time parts from template (HH:MM:SS)
      const templateStartTime = template["Actual Start Time"];
      const templateEndTime = template["Actual End Time"];
      
      // Extract time components from template
      const startTimeMatch = templateStartTime.match(/(\d{2}):(\d{2}):(\d{2})/);
      const endTimeMatch = templateEndTime.match(/(\d{2}):(\d{2}):(\d{2})/);
      
      let actualStartTime, actualEndTime;
      
      if (startTimeMatch && endTimeMatch) {
        const [_, startHour, startMin, startSec] = startTimeMatch;
        const [__, endHour, endMin, endSec] = endTimeMatch;
        
        actualStartTime = `${dateStr} ${startHour}:${startMin}:${startSec}`;
        actualEndTime = `${dateStr} ${endHour}:${endMin}:${endSec}`;
      } else {
        // Fallback to default times if template times are not in expected format
        actualStartTime = `${dateStr} 05:44:30`;
        actualEndTime = `${dateStr} 11:20:28`;
      }
      
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
  const outputFile = 'GJ06BX0309_FinalCorrected_JanJun2025_Data.json';
  fs.writeFileSync(outputFile, JSON.stringify(correctedMonthlyData, null, 2));
  
  console.log(`✅ Final corrected data saved to: ${outputFile}`);
  
  // Show sample records with missed checkpoints
  const recordsWithMissed = correctedMonthlyData.filter(record => record["Missed Checkpoints"] > 0);
  console.log(`\nRecords with missed checkpoints: ${recordsWithMissed.length}`);
  
  if (recordsWithMissed.length > 0) {
    console.log('\nSample records with missed checkpoints (FINAL CORRECTED):');
    recordsWithMissed.slice(0, 10).forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Date: ${record.Date}`);
      console.log(`  Actual Start: ${record["Actual Start Time"]}`);
      console.log(`  Actual End: ${record["Actual End Time"]}`);
      console.log(`  Missed: ${record["Missed Checkpoints"]}`);
      console.log(`  Visited: ${record["Total Visited Checkpoints"]}`);
      console.log(`  Planned: ${record["Planned Checkpoints"]}`);
      console.log(`  Completion: ${record["Checkpoints Complete Status(%)"]}%`);
      console.log('');
    });
  }
  
  // Create the final array for copy-paste
  console.log('\n=== FINAL ARRAY FOR COPY-PASTE (CORRECTED) ===');
  console.log('Copy the following array and paste it into your more_details:');
  console.log('\n' + JSON.stringify(correctedMonthlyData, null, 2));
  
  // Also save to a file for easy access
  const finalOutputFile = 'GJ06BX0309_FinalArray_Corrected.json';
  fs.writeFileSync(finalOutputFile, JSON.stringify(correctedMonthlyData, null, 2));
  console.log(`\n✅ Final array with correct day mapping saved to: ${finalOutputFile}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 