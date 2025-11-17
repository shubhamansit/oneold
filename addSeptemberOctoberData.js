const fs = require('fs');
const XLSX = require('xlsx');

function normalizeVehicleName(vehicle) {
  if (!vehicle) return '';
  return vehicle.toString().trim().replace(/\s+/g, ' ');
}

function extractRouteCode(vehicle) {
  if (!vehicle) return null;
  const match = vehicle.match(/(\d{2}-\d{2}-\d{4})/);
  return match ? match[1] : null;
}

function normalizeRouteCode(route) {
  if (!route) return null;
  return route.toString().trim();
}

function vehiclesMatch(vehicle1, vehicle2) {
  const norm1 = normalizeVehicleName(vehicle1);
  const norm2 = normalizeVehicleName(vehicle2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Match without spaces
  if (norm1.replace(/\s/g, '') === norm2.replace(/\s/g, '')) return true;
  
  // Match route codes
  const route1 = extractRouteCode(norm1);
  const route2 = extractRouteCode(norm2);
  if (route1 && route2 && route1 === route2) return true;
  
  // Partial match (one contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  return false;
}

function buildVehicleZoneMap() {
  console.log('🔍 Building vehicle-to-zone mapping from existing data...');
  
  const zoneFiles = [
    { path: 'data/eastZone.json', zone: 'EAST_ZONE' },
    { path: 'data/wastZone.json', zone: 'WEST_ZONE' },
    { path: 'data/general.json', zone: 'General' },
    { path: 'data/brigrajsinh.json', zone: 'WEST_ZONE' }
  ];
  
  const vehicleZoneMap = new Map(); // vehicle -> zone
  const vehicleJobMap = new Map(); // vehicle -> job record
  
  zoneFiles.forEach(({ path, zone }) => {
    if (!fs.existsSync(path)) {
      console.log(`⚠️  File not found: ${path}`);
      return;
    }
    
    console.log(`📖 Reading ${path}...`);
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    data.forEach(job => {
      if (job.more_details && Array.isArray(job.more_details)) {
        job.more_details.forEach(detail => {
          if (detail.Vehicle) {
            const vehicle = normalizeVehicleName(detail.Vehicle);
            const routeCode = extractRouteCode(detail.Vehicle);
            
            // Map by vehicle name
            if (!vehicleZoneMap.has(vehicle)) {
              vehicleZoneMap.set(vehicle, { zone, job, path });
            }
            
            // Also map by route code if available
            if (routeCode) {
              const routeKey = `ROUTE_${routeCode}`;
              if (!vehicleZoneMap.has(routeKey)) {
                vehicleZoneMap.set(routeKey, { zone, job, path });
              }
            }
            
            // Store job reference for this vehicle
            if (!vehicleJobMap.has(vehicle)) {
              vehicleJobMap.set(vehicle, { zone, job, path });
            }
          }
        });
      }
    });
  });
  
  console.log(`✅ Built map with ${vehicleZoneMap.size} vehicle entries`);
  return { vehicleZoneMap, vehicleJobMap };
}

function findVehicleZone(vehicle, route, vehicleZoneMap, vehicleJobMap) {
  const normalizedVehicle = normalizeVehicleName(vehicle);
  const normalizedRoute = normalizeRouteCode(route);
  const routeCode = extractRouteCode(vehicle) || extractRouteCode(route);
  
  // Try exact vehicle match
  if (vehicleJobMap.has(normalizedVehicle)) {
    return vehicleJobMap.get(normalizedVehicle);
  }
  
  // Try route code match
  if (routeCode) {
    const routeKey = `ROUTE_${routeCode}`;
    if (vehicleJobMap.has(routeKey)) {
      return vehicleJobMap.get(routeKey);
    }
  }
  
  // Try partial matching
  for (const [existingVehicle, jobInfo] of vehicleJobMap.entries()) {
    if (vehiclesMatch(normalizedVehicle, existingVehicle)) {
      return jobInfo;
    }
  }
  
  return null;
}

function readSeptemberCSV() {
  console.log('\n📅 Reading September CSV file...');
  
  const csvContent = fs.readFileSync('SEPT 09 2025 osc.csv', 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Skip header lines (first 2 lines: SR.,09 SEPT,2025 and , RUTE,VEHICLE,T-POI,1,2,3...)
  const dataRows = lines.slice(2);
  
  const vehicles = [];
  
  dataRows.forEach((line, index) => {
    const columns = line.split(',');
    
    if (columns.length < 4) return;
    
    const route = columns[1]?.trim();
    const vehicle = columns[2]?.trim();
    
    if (!vehicle || vehicle === 'VEHICLE' || vehicle === '' || !route || route === 'RUTE') return;
    
    // Extract missed checkpoints for days 1-30 (columns 4-33, indices 3-32)
    const missedCheckpoints = [];
    for (let day = 1; day <= 30; day++) {
      const colIndex = 3 + day; // Column 4 (index 3) is day 1
      const value = columns[colIndex]?.trim();
      const missed = parseInt(value) || 0;
      missedCheckpoints.push(missed);
    }
    
    vehicles.push({
      route,
      vehicle,
      month: 9,
      year: 2025,
      missedCheckpoints
    });
  });
  
  console.log(`✅ Found ${vehicles.length} vehicles in September data`);
  return vehicles;
}

function readOctoberExcel() {
  console.log('\n📅 Reading October Excel file...');
  
  const workbook = XLSX.readFile('Copy of OCT 10 2025 osc.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Skip header rows (first 2 rows: SR.,10 OCT,2025 and , RUTE,VEHICLE,T-POI,1,2,3...)
  const dataRows = rawData.slice(2);
  
  const vehicles = [];
  
  dataRows.forEach((row) => {
    if (!row || row.length < 4) return;
    
    const route = row[1]?.toString().trim();
    const vehicle = row[2]?.toString().trim();
    
    if (!vehicle || vehicle === 'VEHICLE' || vehicle === '' || !route || route === 'RUTE') return;
    
    // Extract missed checkpoints for days 1-31 (columns 4-34, indices 3-33)
    const missedCheckpoints = [];
    for (let day = 1; day <= 31; day++) {
      const colIndex = 3 + day; // Column 4 (index 3) is day 1
      const value = row[colIndex];
      const missed = parseInt(value) || 0;
      missedCheckpoints.push(missed);
    }
    
    vehicles.push({
      route,
      vehicle,
      month: 10,
      year: 2025,
      missedCheckpoints
    });
  });
  
  console.log(`✅ Found ${vehicles.length} vehicles in October data`);
  return vehicles;
}

function generateDailyRecord(template, date, missedCheckpoints) {
  const dateStr = date.split(' ')[0];
  const plannedCheckpoints = template["Planned Checkpoints"] || 40;
  const missed = missedCheckpoints || 0;
  const visited = Math.max(0, plannedCheckpoints - missed);
  const onTime = Math.max(0, visited - (template.Delay || 0));
  const completion = plannedCheckpoints > 0 ? Math.round((visited / plannedCheckpoints) * 100) : 0;
  
  return {
    ...template,
    "Date": date,
    "Start Time": `${dateStr} 00:00:00`,
    "End Time": `${dateStr} 18:00:00`,
    "Actual Start Time": template["Actual Start Time"] ? 
      template["Actual Start Time"].replace(/^\d{4}-\d{2}-\d{2}/, dateStr) : 
      `${dateStr} 05:30:00`,
    "Actual End Time": template["Actual End Time"] ? 
      template["Actual End Time"].replace(/^\d{4}-\d{2}-\d{2}/, dateStr) : 
      `${dateStr} 11:30:00`,
    "On-Time": onTime,
    "Total Visited Checkpoints": visited,
    "Missed Checkpoints": missed,
    "Checkpoints Complete Status(%)": completion
  };
}

function addDataToZones(septemberVehicles, octoberVehicles, vehicleJobMap) {
  console.log('\n🔄 Processing and adding data to zones...');
  
  const zoneFiles = {
    'EAST_ZONE': { path: 'data/eastZone.json', data: null },
    'WEST_ZONE': { path: 'data/wastZone.json', data: null },
    'General': { path: 'data/general.json', data: null },
    'BRIGRAJSINH': { path: 'data/brigrajsinh.json', data: null }
  };
  
  // Load all zone files
  Object.keys(zoneFiles).forEach(zone => {
    const fileInfo = zoneFiles[zone];
    if (fs.existsSync(fileInfo.path)) {
      fileInfo.data = JSON.parse(fs.readFileSync(fileInfo.path, 'utf8'));
      console.log(`📖 Loaded ${fileInfo.data.length} jobs from ${fileInfo.path}`);
    }
  });
  
  let septemberAdded = 0;
  let octoberAdded = 0;
  let skipped = 0;
  const skippedVehicles = [];
  
  // Process September data
  console.log('\n📅 Processing September data...');
  septemberVehicles.forEach(({ vehicle, route, missedCheckpoints }) => {
    const jobInfo = findVehicleZone(vehicle, route, null, vehicleJobMap);
    
    if (!jobInfo) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'September' });
      return;
    }
    
    const { zone, job, path } = jobInfo;
    const fileInfo = zoneFiles[zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone];
    
    if (!fileInfo || !fileInfo.data) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'September', reason: 'Zone file not found' });
      return;
    }
    
    // Find the job in the data
    const jobIndex = fileInfo.data.findIndex(j => 
      j["Job Name"] === job["Job Name"] && 
      j.Zone === job.Zone &&
      j.Ward === job.Ward
    );
    
    if (jobIndex === -1) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'September', reason: 'Job not found in zone file' });
      return;
    }
    
    const targetJob = fileInfo.data[jobIndex];
    if (!targetJob.more_details) {
      targetJob.more_details = [];
    }
    
    // Get a template from existing records for this vehicle
    const template = targetJob.more_details.find(d => 
      vehiclesMatch(d.Vehicle, vehicle)
    ) || targetJob.more_details[0];
    
    if (!template) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'September', reason: 'No template found' });
      return;
    }
    
    // Create a set of existing dates to avoid duplicates
    const existingDates = new Set();
    targetJob.more_details.forEach(d => {
      if (d.Date) {
        existingDates.add(d.Date.split(' ')[0]);
      }
    });
    
    // Add September records (days 1-30)
    for (let day = 1; day <= 30; day++) {
      const date = `2025-09-${day.toString().padStart(2, '0')} 23:30:00`;
      const dateKey = date.split(' ')[0];
      
      if (!existingDates.has(dateKey)) {
        const missed = missedCheckpoints[day - 1] || 0;
        const record = generateDailyRecord(template, date, missed);
        record.Vehicle = template.Vehicle; // Use the existing vehicle name format
        targetJob.more_details.push(record);
        existingDates.add(dateKey);
        septemberAdded++;
      }
    }
    
    // Update job statistics
    const septRecords = targetJob.more_details.filter(d => 
      d.Date && d.Date.startsWith('2025-09')
    );
    targetJob["Total Jobs"] = (targetJob["Total Jobs"] || 0) + septRecords.length;
    targetJob.Completed = (targetJob.Completed || 0) + septRecords.filter(d => 
      d["Missed Checkpoints"] === 0 || d["Checkpoints Complete Status(%)"] >= 90
    ).length;
  });
  
  // Process October data
  console.log('\n📅 Processing October data...');
  octoberVehicles.forEach(({ vehicle, route, missedCheckpoints }) => {
    const jobInfo = findVehicleZone(vehicle, route, null, vehicleJobMap);
    
    if (!jobInfo) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'October' });
      return;
    }
    
    const { zone, job, path } = jobInfo;
    const fileInfo = zoneFiles[zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone];
    
    if (!fileInfo || !fileInfo.data) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'October', reason: 'Zone file not found' });
      return;
    }
    
    // Find the job in the data
    const jobIndex = fileInfo.data.findIndex(j => 
      j["Job Name"] === job["Job Name"] && 
      j.Zone === job.Zone &&
      j.Ward === job.Ward
    );
    
    if (jobIndex === -1) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'October', reason: 'Job not found in zone file' });
      return;
    }
    
    const targetJob = fileInfo.data[jobIndex];
    if (!targetJob.more_details) {
      targetJob.more_details = [];
    }
    
    // Get a template from existing records for this vehicle
    const template = targetJob.more_details.find(d => 
      vehiclesMatch(d.Vehicle, vehicle)
    ) || targetJob.more_details[0];
    
    if (!template) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'October', reason: 'No template found' });
      return;
    }
    
    // Create a set of existing dates to avoid duplicates
    const existingDates = new Set();
    targetJob.more_details.forEach(d => {
      if (d.Date) {
        existingDates.add(d.Date.split(' ')[0]);
      }
    });
    
    // Add October records (days 1-31)
    for (let day = 1; day <= 31; day++) {
      const date = `2025-10-${day.toString().padStart(2, '0')} 23:30:00`;
      const dateKey = date.split(' ')[0];
      
      if (!existingDates.has(dateKey)) {
        const missed = missedCheckpoints[day - 1] || 0;
        const record = generateDailyRecord(template, date, missed);
        record.Vehicle = template.Vehicle; // Use the existing vehicle name format
        targetJob.more_details.push(record);
        existingDates.add(dateKey);
        octoberAdded++;
      }
    }
    
    // Update job statistics
    const octRecords = targetJob.more_details.filter(d => 
      d.Date && d.Date.startsWith('2025-10')
    );
    targetJob["Total Jobs"] = (targetJob["Total Jobs"] || 0) + octRecords.length;
    targetJob.Completed = (targetJob.Completed || 0) + octRecords.filter(d => 
      d["Missed Checkpoints"] === 0 || d["Checkpoints Complete Status(%)"] >= 90
    ).length;
  });
  
  // Save updated zone files
  console.log('\n💾 Saving updated zone files...');
  Object.keys(zoneFiles).forEach(zone => {
    const fileInfo = zoneFiles[zone];
    if (fileInfo && fileInfo.data) {
      // Create backup
      const backupPath = `${fileInfo.path}.backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
      fs.writeFileSync(backupPath, JSON.stringify(JSON.parse(fs.readFileSync(fileInfo.path, 'utf8')), null, 2));
      console.log(`💾 Created backup: ${backupPath}`);
      
      // Save updated file
      fs.writeFileSync(fileInfo.path, JSON.stringify(fileInfo.data, null, 2));
      console.log(`✅ Updated ${fileInfo.path}`);
    }
  });
  
  console.log('\n📊 SUMMARY:');
  console.log(`✅ September records added: ${septemberAdded}`);
  console.log(`✅ October records added: ${octoberAdded}`);
  console.log(`⚠️  Skipped vehicles: ${skipped}`);
  
  if (skippedVehicles.length > 0 && skippedVehicles.length <= 50) {
    console.log('\n⚠️  Skipped vehicles list:');
    skippedVehicles.forEach(({ vehicle, route, month, reason }) => {
      console.log(`  - ${month}: ${vehicle} (${route}) ${reason ? `- ${reason}` : ''}`);
    });
  } else if (skippedVehicles.length > 50) {
    console.log(`\n⚠️  ${skippedVehicles.length} vehicles were skipped (too many to list)`);
  }
  
  return { septemberAdded, octoberAdded, skipped };
}

function main() {
  try {
    console.log('🚀 Starting September and October data addition process...\n');
    
    // Step 1: Build vehicle-to-zone mapping
    const { vehicleZoneMap, vehicleJobMap } = buildVehicleZoneMap();
    
    // Step 2: Read source files
    const septemberVehicles = readSeptemberCSV();
    const octoberVehicles = readOctoberExcel();
    
    // Step 3: Add data to zones
    addDataToZones(septemberVehicles, octoberVehicles, vehicleJobMap);
    
    console.log('\n🎉 Process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, addDataToZones, readSeptemberCSV, readOctoberExcel };

