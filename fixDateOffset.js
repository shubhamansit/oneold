const fs = require('fs');

try {
  console.log('=== FIXING DATE OFFSET ISSUE ===');
  
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
  
  // Generate corrected monthly data with proper date mapping
  const correctedMonthlyData = [];
  
  Object.keys(missedData).forEach(month => {
    const monthData = missedData[month];
    const year = 2025;
    const monthNum = parseInt(month);
    
    console.log(`\nProcessing month ${month} (${monthNum})`);
    
    monthData.forEach(dayData => {
      const day = dayData.day;
      const missedCheckpoints = dayData.missed;
      
      // FIX: The Excel columns are numbered correctly (Column 16 = Day 16), 
      // but my mapping is showing it one day early. So I need to use the day as-is.
      // The issue was that I was adding +1, but actually the Excel data is correct.
      const actualDay = day; // Use the day directly from Excel
      
      // Create date with correct day
      const date = new Date(year, monthNum - 1, actualDay);
      const dateStr = date.toISOString().split('T')[0]; // Just the date part YYYY-MM-DD
      
      // Calculate times - use 00:00:00 for start and 18:00:00 for end
      const startTimeStr = `${dateStr} 00:00:00`;
      const endTimeStr = `${dateStr} 18:00:00`;
      const dateTimeStr = `${dateStr} 18:00:00`; // Main date field
      
      // FIX: Actual times should be dynamic based on the current date, not template date
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
  const outputFile = 'GJ06BX0309_FixedOffset_JanJun2025_Data.json';
  fs.writeFileSync(outputFile, JSON.stringify(correctedMonthlyData, null, 2));
  
  console.log(`✅ Fixed data saved to: ${outputFile}`);
  
  // Show sample records with missed checkpoints
  const recordsWithMissed = correctedMonthlyData.filter(record => record["Missed Checkpoints"] > 0);
  console.log(`\nRecords with missed checkpoints: ${recordsWithMissed.length}`);
  
  if (recordsWithMissed.length > 0) {
    console.log('\nSample records with missed checkpoints (FIXED OFFSET):');
    recordsWithMissed.slice(0, 5).forEach((record, index) => {
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
  console.log('\n=== FINAL ARRAY FOR COPY-PASTE (FIXED OFFSET) ===');
  console.log('Copy the following array and paste it into your more_details:');
  console.log('\n' + JSON.stringify(correctedMonthlyData, null, 2));
  
  // Also save to a file for easy access
  const finalOutputFile = 'GJ06BX0309_FinalArray_FixedOffset.json';
  fs.writeFileSync(finalOutputFile, JSON.stringify(correctedMonthlyData, null, 2));
  console.log(`\n✅ Final array with fixed offset saved to: ${finalOutputFile}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 