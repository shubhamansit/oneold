const fs = require('fs');

try {
  console.log('=== CREATING NEW COMPLETE MONTHLY DATA ===');
  
  // Load vehicle template
  const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
  const targetVehicle = 'GJ 06 BX 0309  E-1 - truck';
  const template = templates.find(t => t.Vehicle === targetVehicle);
  
  if (!template) {
    console.log('❌ Vehicle template not found');
    return;
  }
  
  console.log('Found vehicle template');
  
  // Define the missed checkpoint data manually (from Excel analysis)
  const missedCheckpointsData = {
    "01": { // January
      16: 1, 22: 11, 23: 6, 24: 10, 29: 5, 30: 1
    },
    "02": { // February
      27: 5
    },
    "03": { // March
      5: 1, 13: 8, 27: 16, 28: 2
    },
    "04": { // April - No data in Excel, all 0
    },
    "05": { // May
      7: 5, 10: 5, 11: 1, 13: 7, 14: 7, 16: 4, 17: 9, 21: 10, 23: 12, 26: 7
    },
    "06": { // June
      11: 12, 14: 29, 15: 10, 25: 5, 26: 7, 27: 21, 28: 10
    }
  };
  
  // Generate complete monthly data for all days
  const completeMonthlyData = [];
  
  Object.keys(missedCheckpointsData).forEach(month => {
    const monthData = missedCheckpointsData[month];
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
    
    // Generate records for ALL days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const missedCheckpoints = monthData[day] || 0;
      
      // Create date with the correct day
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Calculate times
      const startTimeStr = `${dateStr} 00:00:00`;
      const endTimeStr = `${dateStr} 18:00:00`;
      const dateTimeStr = `${dateStr} 18:00:00`;
      
      // Extract time parts from template
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
        // Fallback to default times
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
  const outputFile = 'GJ06BX0309_NewComplete_JanJun2025_Data.json';
  fs.writeFileSync(outputFile, JSON.stringify(completeMonthlyData, null, 2));
  
  console.log(`✅ Complete data saved to: ${outputFile}`);
  
  // Show sample records with missed checkpoints
  const recordsWithMissed = completeMonthlyData.filter(record => record["Missed Checkpoints"] > 0);
  console.log(`\nRecords with missed checkpoints: ${recordsWithMissed.length}`);
  
  if (recordsWithMissed.length > 0) {
    console.log('\nSample records with missed checkpoints (NEW DATA):');
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
  console.log('\n=== FINAL ARRAY FOR COPY-PASTE (NEW DATA) ===');
  console.log('Copy the following array and paste it into your more_details:');
  console.log('\n' + JSON.stringify(completeMonthlyData, null, 2));
  
  // Also save to a file for easy access
  const finalOutputFile = 'GJ06BX0309_NewFinalArray.json';
  fs.writeFileSync(finalOutputFile, JSON.stringify(completeMonthlyData, null, 2));
  console.log(`\n✅ Final array with new data saved to: ${finalOutputFile}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 