const fs = require('fs');

// Function to generate monthly data for each vehicle
function generateMonthlyData(year, month) {
  try {
    // Read vehicle templates
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Array to store all monthly data
    const monthlyData = [];
    
    // Generate data for each vehicle
    vehicleTemplates.forEach(template => {
      const vehicleName = template.Vehicle;
      
      // Generate data for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        // Format date strings
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateTimeStr = `${dateStr} 23:30:00`;
        const startTimeStr = `${dateStr} 00:00:00`;
        const endTimeStr = `${dateStr} 18:00:00`;
        
        // Extract time parts from template
        const actualStartTimeParts = template["Actual Start Time"].split(' ')[1];
        const actualEndTimeParts = template["Actual End Time"].split(' ')[1];
        
        // Create actual start and end times for this day
        const actualStartTime = `${dateStr} ${actualStartTimeParts}`;
        const actualEndTime = `${dateStr} ${actualEndTimeParts}`;
        
        // Calculate random variations for realistic data
        const plannedCheckpoints = template["Planned Checkpoints"];
        
        // Generate random missed checkpoints (0 to 20% of planned)
        const maxMissed = Math.floor(plannedCheckpoints * 0.2);
        const missedCheckpoints = Math.floor(Math.random() * (maxMissed + 1));
        
        // Calculate visited checkpoints
        const visitedCheckpoints = plannedCheckpoints - missedCheckpoints;
        
        // Calculate on-time checkpoints (visited - some delays)
        const maxDelays = Math.floor(visitedCheckpoints * 0.3);
        const delays = Math.floor(Math.random() * (maxDelays + 1));
        const onTimeCheckpoints = visitedCheckpoints - delays;
        
        // Calculate completion percentage
        const completionPercentage = Math.round((visitedCheckpoints / plannedCheckpoints) * 100);
        
        // Generate random distance variations
        const estimatedDistance = template["Estimated Distance"];
        const distanceVariation = Math.random() * 0.4 + 0.8; // 80% to 120% of estimated
        const actualDistance = Math.round(estimatedDistance * distanceVariation);
        
        // Calculate distance completion percentage
        const distanceCompletedPercentage = Math.round((actualDistance / estimatedDistance) * 100);
        
        // Generate random halt time variations
        const avgHaltTime = template["avg_halt_time"];
        const [haltMinutes, haltSeconds] = avgHaltTime.split(':').map(Number);
        const totalHaltSeconds = haltMinutes * 60 + haltSeconds;
        const haltVariation = Math.random() * 0.4 + 0.8; // 80% to 120% variation
        const newHaltSeconds = Math.round(totalHaltSeconds * haltVariation);
        const newHaltMinutes = Math.floor(newHaltSeconds / 60);
        const newHaltSecs = newHaltSeconds % 60;
        const newAvgHaltTime = `${newHaltMinutes}:${newHaltSecs.toString().padStart(2, '0')}`;
        
        // Create daily record
        const dailyRecord = {
          "Date": dateTimeStr,
          "Vehicle": vehicleName,
          "Start Time": startTimeStr,
          "End Time": endTimeStr,
          "Actual Start Time": actualStartTime,
          "Actual End Time": actualEndTime,
          "Planned Checkpoints": plannedCheckpoints,
          "On-Time": onTimeCheckpoints,
          "Early": 0,
          "Delay": delays,
          "Total Visited Checkpoints": visitedCheckpoints,
          "Missed Checkpoints": missedCheckpoints,
          "Checkpoints Complete Status(%)": completionPercentage,
          "Estimated Distance": estimatedDistance,
          "Distance": actualDistance,
          "Distance Completed %": distanceCompletedPercentage,
          "Route Distance": template["Route Distance"] || estimatedDistance,
          "On Route": template["On Route"] || 100,
          "Off Route": template["Off Route"] || 0,
          "Off Route %": template["Off Route %"] || 0,
          "Early Arrival Condition(Minute)": "0:00",
          "Delay Arrival Condition(Minute)": "0:00",
          "Group Name": template["Group Name"] || "--",
          "Penalty": 0,
          "Reason": "--",
          "Remark": "--",
          "Waste Weight": 0,
          "Incidents": 0,
          "Assigned": template["Assigned"] || "--",
          "Present": template["Present"] || "--",
          "avg_halt_time": newAvgHaltTime
        };
        
        monthlyData.push(dailyRecord);
      }
    });
    
    return monthlyData;
    
  } catch (error) {
    console.error('Error generating monthly data:', error);
    return [];
  }
}

// Function to save monthly data to file
function saveMonthlyData(data, year, month) {
  try {
    const filename = `monthlyData_${year}_${month.toString().padStart(2, '0')}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`✅ Monthly data saved to ${filename}`);
    console.log(`📊 Generated ${data.length} records for ${data.length / 31} vehicles over ${new Date(year, month, 0).getDate()} days`);
    return filename;
  } catch (error) {
    console.error('Error saving monthly data:', error);
    return null;
  }
}

// Function to generate data with custom missed checkpoint patterns
function generateMonthlyDataWithPatterns(year, month, missedPatterns = {}) {
  try {
    // Read vehicle templates
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Array to store all monthly data
    const monthlyData = [];
    
    // Generate data for each vehicle
    vehicleTemplates.forEach(template => {
      const vehicleName = template.Vehicle;
      
      // Get missed pattern for this vehicle (if provided)
      const vehicleMissedPattern = missedPatterns[vehicleName] || [];
      
      // Generate data for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        // Format date strings
        const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateTimeStr = `${dateStr} 23:30:00`;
        const startTimeStr = `${dateStr} 00:00:00`;
        const endTimeStr = `${dateStr} 18:00:00`;
        
        // Extract time parts from template
        const actualStartTimeParts = template["Actual Start Time"].split(' ')[1];
        const actualEndTimeParts = template["Actual End Time"].split(' ')[1];
        
        // Create actual start and end times for this day
        const actualStartTime = `${dateStr} ${actualStartTimeParts}`;
        const actualEndTime = `${dateStr} ${actualEndTimeParts}`;
        
        // Calculate checkpoints based on pattern or random
        const plannedCheckpoints = template["Planned Checkpoints"];
        
        let missedCheckpoints = 0;
        if (vehicleMissedPattern.length > 0 && day <= vehicleMissedPattern.length) {
          // Use pattern data
          missedCheckpoints = vehicleMissedPattern[day - 1] || 0;
        } else {
          // Generate random missed checkpoints (0 to 20% of planned)
          const maxMissed = Math.floor(plannedCheckpoints * 0.2);
          missedCheckpoints = Math.floor(Math.random() * (maxMissed + 1));
        }
        
        // Calculate visited checkpoints
        const visitedCheckpoints = plannedCheckpoints - missedCheckpoints;
        
        // Calculate on-time checkpoints (visited - some delays)
        const maxDelays = Math.floor(visitedCheckpoints * 0.3);
        const delays = Math.floor(Math.random() * (maxDelays + 1));
        const onTimeCheckpoints = visitedCheckpoints - delays;
        
        // Calculate completion percentage
        const completionPercentage = Math.round((visitedCheckpoints / plannedCheckpoints) * 100);
        
        // Create exact copy of template with updated values
        const dailyRecord = {
          ...template, // Copy all template properties
          "Date": dateTimeStr,
          "Start Time": startTimeStr,
          "End Time": endTimeStr,
          "Actual Start Time": actualStartTime,
          "Actual End Time": actualEndTime,
          "On-Time": onTimeCheckpoints,
          "Delay": delays,
          "Total Visited Checkpoints": visitedCheckpoints,
          "Missed Checkpoints": missedCheckpoints,
          "Checkpoints Complete Status(%)": completionPercentage
        };
        
        monthlyData.push(dailyRecord);
      }
    });
    
    return monthlyData;
    
  } catch (error) {
    console.error('Error generating monthly data with patterns:', error);
    return [];
  }
}

// Main function to run the script
function main() {
  console.log('🚀 Starting monthly data generation...');
  
  // Generate data for January 2025
  const year = 2025;
  const month = 1;
  
  // Automatically detect and load missed checkpoint patterns
  let missedPatterns = {};
  const patternsFile = 'missedCheckpointPatterns.json';
  
  if (fs.existsSync(patternsFile)) {
    try {
      const patternsData = fs.readFileSync(patternsFile, 'utf8');
      missedPatterns = JSON.parse(patternsData);
      console.log(`📊 Automatically loaded patterns for ${Object.keys(missedPatterns).length} vehicles from ${patternsFile}`);
    } catch (error) {
      console.log('📊 Error loading patterns file, using random patterns');
    }
  } else {
    console.log('📊 No patterns file found, using random patterns for all vehicles');
  }
  
  // Generate monthly data
  const monthlyData = generateMonthlyDataWithPatterns(year, month, missedPatterns);
  
  if (monthlyData.length > 0) {
    // Save to file
    const filename = saveMonthlyData(monthlyData, year, month);
    
    if (filename) {
      console.log(`\n📈 Summary:`);
      console.log(`- Year: ${year}`);
      console.log(`- Month: ${month}`);
      console.log(`- Total Records: ${monthlyData.length}`);
      console.log(`- Total Vehicles: ${monthlyData.length / 31}`);
      console.log(`- Days in Month: ${new Date(year, month, 0).getDate()}`);
      
      // Show sample data
      console.log(`\n📋 Sample Record:`);
      console.log(JSON.stringify(monthlyData[0], null, 2));
    }
  } else {
    console.error('❌ Failed to generate monthly data');
  }
}

// Export functions for use in other modules
module.exports = {
  generateMonthlyData,
  generateMonthlyDataWithPatterns,
  saveMonthlyData
};

// Run the script if called directly
if (require.main === module) {
  main();
} 