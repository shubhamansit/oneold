const fs = require('fs');

// The 4 major JSON files
const zoneFiles = [
  'data/eastZone.json',
  'data/wastZone.json',
  'data/general.json',
  'data/brigrajsinh.json'
];

function extractDayFromDate(dateStr) {
  // Extract day from date string like "2025-08-01 23:30:00"
  const match = dateStr.match(/2025-(08|09|10)-(\d{2})/);
  if (match) {
    return parseInt(match[2], 10);
  }
  return null;
}

function extractTimeFromDateTime(dateTimeStr) {
  // Extract time portion from "2025-08-01 05:45:59" -> "05:45:59"
  const match = dateTimeStr.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function updateDateInTimeField(timeField, newDate, timePortion) {
  // Update date in time field while preserving time
  // "2025-08-01 05:45:59" -> "2025-09-01 05:45:59" or "2025-10-01 05:45:59"
  if (!timeField || !timePortion) return timeField;
  return `${newDate} ${timePortion}`;
}

function processZoneFile(filePath) {
  console.log(`\n📖 Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  // Read the file
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let totalUpdated = 0;

  // Process each job
  data.forEach((job, jobIndex) => {
    if (!job.more_details || !Array.isArray(job.more_details)) {
      return;
    }

    // Group entries by vehicle and month
    const vehicleMap = new Map(); // vehicle -> { august: [], september: [], october: [] }

    job.more_details.forEach((detail, detailIndex) => {
      if (!detail.Vehicle || !detail.Date) return;

      const vehicle = detail.Vehicle;
      const dateStr = detail.Date;
      
      if (!vehicleMap.has(vehicle)) {
        vehicleMap.set(vehicle, {
          august: [],
          september: [],
          october: []
        });
      }

      const vehicleData = vehicleMap.get(vehicle);

      if (dateStr.includes('2025-08-')) {
        vehicleData.august.push({ detail, detailIndex });
      } else if (dateStr.includes('2025-09-')) {
        vehicleData.september.push({ detail, detailIndex });
      } else if (dateStr.includes('2025-10-')) {
        vehicleData.october.push({ detail, detailIndex });
      }
    });

    // Process each vehicle
    vehicleMap.forEach((vehicleData, vehicle) => {
      // Create a map of August data by day
      const augustByDay = new Map();
      vehicleData.august.forEach(({ detail }) => {
        const day = extractDayFromDate(detail.Date);
        if (day !== null) {
          augustByDay.set(day, detail);
        }
      });

      // Update September data
      vehicleData.september.forEach(({ detail, detailIndex }) => {
        const day = extractDayFromDate(detail.Date);
        const augustData = augustByDay.get(day);

        if (augustData) {
          // Extract time portions from August data
          const startTimePortion = extractTimeFromDateTime(augustData["Start Time"]);
          const endTimePortion = extractTimeFromDateTime(augustData["End Time"]);
          const actualStartTimePortion = extractTimeFromDateTime(augustData["Actual Start Time"]);
          const actualEndTimePortion = extractTimeFromDateTime(augustData["Actual End Time"]);

          // Get the new date (September)
          const newDate = detail.Date.match(/(\d{4}-\d{2}-\d{2})/)[1];

          // Update time fields with new date but same time
          if (startTimePortion) {
            detail["Start Time"] = updateDateInTimeField(detail["Start Time"], newDate, startTimePortion);
          }
          if (endTimePortion) {
            detail["End Time"] = updateDateInTimeField(detail["End Time"], newDate, endTimePortion);
          }
          if (actualStartTimePortion) {
            detail["Actual Start Time"] = updateDateInTimeField(detail["Actual Start Time"], newDate, actualStartTimePortion);
          }
          if (actualEndTimePortion) {
            detail["Actual End Time"] = updateDateInTimeField(detail["Actual End Time"], newDate, actualEndTimePortion);
          }

          // Update avg_halt_time (copy directly from August)
          // Always update if August data has this field
          if (augustData.avg_halt_time != null) {
            detail.avg_halt_time = augustData.avg_halt_time;
          }

          totalUpdated++;
        }
      });

      // Update October data
      vehicleData.october.forEach(({ detail, detailIndex }) => {
        const day = extractDayFromDate(detail.Date);
        const augustData = augustByDay.get(day);

        if (augustData) {
          // Extract time portions from August data
          const startTimePortion = extractTimeFromDateTime(augustData["Start Time"]);
          const endTimePortion = extractTimeFromDateTime(augustData["End Time"]);
          const actualStartTimePortion = extractTimeFromDateTime(augustData["Actual Start Time"]);
          const actualEndTimePortion = extractTimeFromDateTime(augustData["Actual End Time"]);

          // Get the new date (October)
          const newDate = detail.Date.match(/(\d{4}-\d{2}-\d{2})/)[1];

          // Update time fields with new date but same time
          if (startTimePortion) {
            detail["Start Time"] = updateDateInTimeField(detail["Start Time"], newDate, startTimePortion);
          }
          if (endTimePortion) {
            detail["End Time"] = updateDateInTimeField(detail["End Time"], newDate, endTimePortion);
          }
          if (actualStartTimePortion) {
            detail["Actual Start Time"] = updateDateInTimeField(detail["Actual Start Time"], newDate, actualStartTimePortion);
          }
          if (actualEndTimePortion) {
            detail["Actual End Time"] = updateDateInTimeField(detail["Actual End Time"], newDate, actualEndTimePortion);
          }

          // Update avg_halt_time (copy directly from August)
          // Always update if August data has this field
          if (augustData.avg_halt_time != null) {
            detail.avg_halt_time = augustData.avg_halt_time;
          }

          totalUpdated++;
        }
      });
    });
  });

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Updated ${totalUpdated} entries in ${filePath}`);
  
  return totalUpdated;
}

// Main execution
console.log('🚀 Starting update of September and October data with August times...\n');

let grandTotal = 0;
zoneFiles.forEach(filePath => {
  const updated = processZoneFile(filePath);
  if (updated !== undefined) {
    grandTotal += updated;
  }
});

console.log(`\n✨ Complete! Total entries updated: ${grandTotal}`);

