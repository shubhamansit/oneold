const fs = require('fs');

try {
  console.log('=== GENERATING COMPLETE MONTHLY DATA ===');
  
  // Load the correct day mapping data
  const missedData = JSON.parse(fs.readFileSync('GJ06BX0309_CorrectDayMapping.json', 'utf8'));
  console.log('Loaded day mapping data for months:', Object.keys(missedData));
  
  // Load vehicle template
  const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
  const targetVehicle = 'GJ 06 BX 0309  E-1 - truck';
  const template = templates.find(t => t.Vehicle === targetVehicle);
  
  if (!template) {
    console.log('❌ Vehicle template not found');
    return;
  }
  
  console.log('Found vehicle template');
  
  // Generate complete monthly data for all days
  const completeMonthlyData = [];
  
  Object.keys(missedData).forEach(month => {
    const monthData = missedData[month];
    const year = 2025;
    const monthNum = parseInt(month);
    
    // Determine the number of days in this month
    let daysInMonth;
    if (monthNum === 2) {
      // February 2025 has 28 days (not a leap year)
      daysInMonth = 28;
    } else if ([4, 6, 9, 11].includes(monthNum)) {
      // April, June, September, November have 30 days
      daysInMonth = 30;
    } else {
      // January, March, May, July, August, October, December have 31 days
      daysInMonth = 31;
    }
    
    console.log(`\nProcessing month ${month} (${monthNum}): ${daysInMonth} days`);
    
    // Create a map of existing data for quick lookup
    const existingDataMap = {};
    monthData.forEach(dayData => {
      existingDataMap[dayData.day] = dayData.missed;
    });
    
    // Generate records for ALL days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const missedCheckpoints = existingDataMap[day] || 0;
      
      // Create date with the correct day - FIXED: Use proper month format
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
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
      
      completeMonthlyData.push(record);
    }
    
    console.log(`Month ${month}: ${daysInMonth} records generated`);
  });
  
  console.log(`\nTotal records generated: ${completeMonthlyData.length}`);
  
  // Save the complete data
  const outputFile = 'GJ06BX0309_Complete_JanJun2025_Data.json';
  fs.writeFileSync(outputFile, JSON.stringify(completeMonthlyData, null, 2));
  
  console.log(`✅ Complete data saved to: ${outputFile}`);
  
  // Show sample records with missed checkpoints
  const recordsWithMissed = completeMonthlyData.filter(record => record["Missed Checkpoints"] > 0);
  console.log(`\nRecords with missed checkpoints: ${recordsWithMissed.length}`);
  
  if (recordsWithMissed.length > 0) {
    console.log('\nSample records with missed checkpoints (COMPLETE DATA):');
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
  
  // Show first few records to verify dates
  console.log('\n=== FIRST 10 RECORDS (VERIFY DATES) ===');
  completeMonthlyData.slice(0, 10).forEach((record, index) => {
    console.log(`Record ${index + 1}: ${record.Date}`);
  });
  
  // Create the final array for copy-paste
  console.log('\n=== FINAL ARRAY FOR COPY-PASTE (COMPLETE DATA) ===');
  console.log('Copy the following array and paste it into your more_details:');
  console.log('\n' + JSON.stringify(completeMonthlyData, null, 2));
  
  // Also save to a file for easy access
  const finalOutputFile = 'GJ06BX0309_FinalArray_Complete.json';
  fs.writeFileSync(finalOutputFile, JSON.stringify(completeMonthlyData, null, 2));
  console.log(`\n✅ Final array with complete data saved to: ${finalOutputFile}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 