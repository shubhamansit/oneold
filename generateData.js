// Simple script to generate monthly data
// Just change the template, month, year, and missedMilestones below

function generateMonthlyData(template, month, year, missedMilestones) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthData = [];

  // Extract time components from template
  const templateStartTime = template["Actual Start Time"];
  const templateEndTime = template["Actual End Time"];
  
  // Extract time parts (HH:MM:SS)
  const startTimeParts = templateStartTime.split(' ')[1];
  const endTimeParts = templateEndTime.split(' ')[1];

  for (let day = 1; day <= daysInMonth; day++) {
    const missedCheckpoints = missedMilestones[day] || 0;
    const plannedCheckpoints = template["Planned Checkpoints"];
    const onTime = plannedCheckpoints - missedCheckpoints;
    const totalVisited = onTime;
    const completionPercentage = plannedCheckpoints > 0 ? Math.round((totalVisited / plannedCheckpoints) * 100) : 0;

    // Format date strings
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const startTimeStr = `${dateStr} 00:00:00`;
    const endTimeStr = `${dateStr} 18:00:00`;
    const actualStartTimeStr = `${dateStr} ${startTimeParts}`;
    const actualEndTimeStr = `${dateStr} ${endTimeParts}`;
    const reportDateStr = `${dateStr} 23:30:00`;

    const dayData = {
      ...template,
      Date: reportDateStr,
      "Start Time": startTimeStr,
      "End Time": endTimeStr,
      "Actual Start Time": actualStartTimeStr,
      "Actual End Time": actualEndTimeStr,
      "On-Time": onTime,
      "Total Visited Checkpoints": totalVisited,
      "Missed Checkpoints": missedCheckpoints,
      "Checkpoints Complete Status(%)": completionPercentage,
    };

    monthData.push(dayData);
  }

  return monthData;
}

// ===== YOUR BOILERPLATE TEMPLATE =====
// Copy your template here and modify as needed
const template =    {
    Date: "2024-10-01 23:30:00",
    Vehicle: "GJ 04 GB 0480 RUT 03-08-0480 - Default",
    "Start Time": "2024-10-01 00:00:00",
    "End Time": "2024-10-01 18:00:00",
    "Actual Start Time": "2024-10-01 05:37:12",
    "Actual End Time": "2024-10-01 11:22:51",
    "Planned Checkpoints": 41,
    "On-Time": 41,
    Early: 0,
    Delay: 0,
    "Total Visited Checkpoints": 41,
    "Missed Checkpoints": 0,
    "Checkpoints Complete Status(%)": 100,
    "Estimated Distance": 7,
    Distance: 15,
    "Distance Completed %": 100,
    "Route Distance": 15,
    "On Route": 100,
    "Off Route": 0,
    "Off Route %": 0,
    "Early Arrival Condition(Minute)": "0:00",
    "Delay Arrival Condition(Minute)": "0:00",
    "Group Name": "--",
    Penalty: 0,
    Reason: "--",
    Remark: "--",
    "Waste Weight": 0,
    Incidents: 0,
    Assigned: "--",
    Present: "--",
    avg_halt_time: "2:02",
  }
// ===== CONFIGURATION =====
// Change these values as needed
const month = 1; // 1 = January, 2 = February, etc.
const year = 2025;

// ===== MISSED MILESTONES =====
// Format: { day: missedCheckpoints }
// Example: { 23: 2, 25: 1 } means 2 missed on 23rd, 1 missed on 25th
const missedMilestones = {
2:2,
15:1
// Add more dates as needed
};

// ===== GENERATE DATA =====
const monthlyData = generateMonthlyData(template, month, year, missedMilestones);

// ===== OUTPUT =====
console.log(`Generated data for ${month}/${year} with ${monthlyData.length} days:\n`);

// Output each object separately as comma-separated JSON
monthlyData.forEach((dayData, index) => {
  console.log(JSON.stringify(dayData, null, 2));
  if (index < monthlyData.length - 1) {
    console.log(',');
  }
});

// Save to file as comma-separated JSON objects
const fs = require('fs');
const fileName = `monthlyData_${year}_${month.toString().padStart(2, '0')}.json`;
let fileContent = '';
monthlyData.forEach((dayData, index) => {
  fileContent += JSON.stringify(dayData, null, 2);
  if (index < monthlyData.length - 1) {
    fileContent += ',';
  }
  fileContent += '\n';
});
fs.writeFileSync(fileName, fileContent);
console.log(`\nData saved to ${fileName} as comma-separated JSON objects`);