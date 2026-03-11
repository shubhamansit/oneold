const fs = require('fs');
const XLSX = require('xlsx');

// First, restore backups
function restoreBackups() {
  console.log('🔄 Restoring backups...');
  
  const zoneFiles = [
    'data/eastZone.json',
    'data/wastZone.json',
    'data/general.json',
    'data/brigrajsinh.json'
  ];
  
  zoneFiles.forEach(file => {
    // Find the most recent backup
    const files = fs.readdirSync('data').filter(f => 
      f.startsWith(file.replace('data/', '')) && f.includes('.backup_')
    );
    
    if (files.length > 0) {
      // Sort by name (which includes timestamp) and get the latest
      files.sort().reverse();
      const latestBackup = `data/${files[0]}`;
      
      if (fs.existsSync(latestBackup)) {
        const backupContent = fs.readFileSync(latestBackup, 'utf8');
        fs.writeFileSync(file, backupContent);
        console.log(`✅ Restored ${file} from ${latestBackup}`);
      }
    }
  });
}

// Extract vehicle number (e.g., "GJ04GB0086" from "GJ 04 GB 0086" or "GJ04GB0086")
function extractVehicleNumber(vehicle) {
  if (!vehicle) return null;
  const str = vehicle.toString().trim();
  // Match pattern like GJ04GB0086 or GJ 04 GB 0086
  const match = str.match(/GJ\s*(\d{2})\s*([A-Z]{1,2})\s*(\d{4})/i);
  if (match) {
    return `GJ${match[1]}${match[2].toUpperCase()}${match[3]}`;
  }
  return null;
}

// Extract route code (e.g., "01-01-0086")
function extractRouteCode(route) {
  if (!route) return null;
  const str = route.toString().trim();
  const match = str.match(/(\d{2}-\d{2}-\d{4})/);
  return match ? match[1] : null;
}

// Build comprehensive vehicle mapping
function buildVehicleMapping() {
  console.log('\n🔍 Building comprehensive vehicle mapping...');
  
  const zoneFiles = [
    { path: 'data/eastZone.json', zone: 'EAST_ZONE' },
    { path: 'data/wastZone.json', zone: 'WEST_ZONE' },
    { path: 'data/general.json', zone: 'General' },
    { path: 'data/brigrajsinh.json', zone: 'WEST_ZONE', isBrigrajsinh: true }
  ];
  
  const vehicleMap = new Map(); // vehicleNumber -> { zone, job, path, vehicleName }
  const routeMap = new Map(); // routeCode -> { zone, job, path, vehicleName }
  
  zoneFiles.forEach(({ path, zone, isBrigrajsinh }) => {
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
            const vehicleNumber = extractVehicleNumber(detail.Vehicle);
            const routeCode = extractRouteCode(detail.Vehicle);
            
            if (vehicleNumber) {
              // Map by vehicle number
              if (!vehicleMap.has(vehicleNumber)) {
                vehicleMap.set(vehicleNumber, {
                  zone: isBrigrajsinh ? 'BRIGRAJSINH' : zone,
                  job,
                  path,
                  vehicleName: detail.Vehicle
                });
              }
            }
            
            if (routeCode) {
              // Map by route code
              if (!routeMap.has(routeCode)) {
                routeMap.set(routeCode, {
                  zone: isBrigrajsinh ? 'BRIGRAJSINH' : zone,
                  job,
                  path,
                  vehicleName: detail.Vehicle
                });
              }
            }
          }
        });
      }
    });
  });
  
  console.log(`✅ Built mapping: ${vehicleMap.size} vehicles, ${routeMap.size} routes`);
  return { vehicleMap, routeMap };
}

// Find vehicle in mapping
function findVehicle(vehicle, route, vehicleMap, routeMap) {
  // Try vehicle number first
  const vehicleNumber = extractVehicleNumber(vehicle);
  if (vehicleNumber && vehicleMap.has(vehicleNumber)) {
    return vehicleMap.get(vehicleNumber);
  }
  
  // Try route code
  const routeCode = extractRouteCode(route) || extractRouteCode(vehicle);
  if (routeCode && routeMap.has(routeCode)) {
    return routeMap.get(routeCode);
  }
  
  return null;
}

// Read September CSV
function readSeptemberCSV() {
  console.log('\n📅 Reading September CSV file...');
  
  const csvContent = fs.readFileSync('SEPT 09 2025 osc.csv', 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const dataRows = lines.slice(2);
  
  const vehicles = [];
  
  dataRows.forEach((line) => {
    const columns = line.split(',');
    if (columns.length < 4) return;
    
    const route = columns[1]?.trim();
    const vehicle = columns[2]?.trim();
    
    if (!vehicle || vehicle === 'VEHICLE' || vehicle === '' || !route || route === 'RUTE') return;
    
    const missedCheckpoints = [];
    for (let day = 1; day <= 30; day++) {
      const colIndex = 3 + day;
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

// Read October Excel
function readOctoberExcel() {
  console.log('\n📅 Reading October Excel file...');
  
  const workbook = XLSX.readFile('Copy of OCT 10 2025 osc.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const dataRows = rawData.slice(2);
  
  const vehicles = [];
  
  dataRows.forEach((row) => {
    if (!row || row.length < 4) return;
    
    const route = row[1]?.toString().trim();
    const vehicle = row[2]?.toString().trim();
    
    if (!vehicle || vehicle === 'VEHICLE' || vehicle === '' || !route || route === 'RUTE') return;
    
    const missedCheckpoints = [];
    for (let day = 1; day <= 31; day++) {
      const colIndex = 3 + day;
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

// Generate daily record
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

// Add data to zones with better matching
function addDataToZones(septemberVehicles, octoberVehicles, vehicleMap, routeMap) {
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
  const matchedVehicles = new Set();
  
  // Process September data
  console.log('\n📅 Processing September data...');
  septemberVehicles.forEach(({ vehicle, route, missedCheckpoints }) => {
    const match = findVehicle(vehicle, route, vehicleMap, routeMap);
    
    if (!match) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'September', reason: 'No match found' });
      return;
    }
    
    const { zone, job, path, vehicleName } = match;
    const fileInfo = zoneFiles[zone];
    
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
    
    // Find template record for this vehicle (use the exact vehicle name from zone file)
    const template = targetJob.more_details.find(d => {
      const dVehicleNum = extractVehicleNumber(d.Vehicle);
      const inputVehicleNum = extractVehicleNumber(vehicle);
      return dVehicleNum && inputVehicleNum && dVehicleNum === inputVehicleNum;
    });
    
    if (!template) {
      // Try to find any record in this job as template
      const anyTemplate = targetJob.more_details[0];
      if (!anyTemplate) {
        skipped++;
        skippedVehicles.push({ vehicle, route, month: 'September', reason: 'No template found' });
        return;
      }
      // Use any template but we'll need to adjust vehicle name
      const vehicleNum = extractVehicleNumber(vehicle);
      const routeCode = extractRouteCode(route) || extractRouteCode(vehicle);
      
      // Create a template-like record
      const newTemplate = { ...anyTemplate };
      if (vehicleNum) {
        // Try to construct vehicle name from vehicle number and route
        newTemplate.Vehicle = vehicleName || `${vehicleNum.replace(/(\d{2})([A-Z]+)(\d{4})/, 'GJ $1 $2 $3')} RUT ${routeCode || ''}`;
      }
      
      // Add September records
      const existingDates = new Set();
      targetJob.more_details.forEach(d => {
        if (d.Date) existingDates.add(d.Date.split(' ')[0]);
      });
      
      for (let day = 1; day <= 30; day++) {
        const date = `2025-09-${day.toString().padStart(2, '0')} 23:30:00`;
        const dateKey = date.split(' ')[0];
        
        if (!existingDates.has(dateKey)) {
          const missed = missedCheckpoints[day - 1] || 0;
          const record = generateDailyRecord(newTemplate, date, missed);
          record.Vehicle = newTemplate.Vehicle;
          targetJob.more_details.push(record);
          existingDates.add(dateKey);
          septemberAdded++;
        }
      }
      
      matchedVehicles.add(vehicle);
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
    
    matchedVehicles.add(vehicle);
    
    // Update job statistics
    const septRecords = targetJob.more_details.filter(d => 
      d.Date && d.Date.startsWith('2025-09')
    );
    targetJob["Total Jobs"] = (targetJob["Total Jobs"] || 0) + septRecords.length;
    targetJob.Completed = (targetJob.Completed || 0) + septRecords.filter(d => 
      d["Missed Checkpoints"] === 0 || d["Checkpoints Complete Status(%)"] >= 90
    ).length;
  });
  
  // Process October data (similar logic)
  console.log('\n📅 Processing October data...');
  octoberVehicles.forEach(({ vehicle, route, missedCheckpoints }) => {
    const match = findVehicle(vehicle, route, vehicleMap, routeMap);
    
    if (!match) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'October', reason: 'No match found' });
      return;
    }
    
    const { zone, job, path, vehicleName } = match;
    const fileInfo = zoneFiles[zone];
    
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
    
    // Find template record for this vehicle
    const template = targetJob.more_details.find(d => {
      const dVehicleNum = extractVehicleNumber(d.Vehicle);
      const inputVehicleNum = extractVehicleNumber(vehicle);
      return dVehicleNum && inputVehicleNum && dVehicleNum === inputVehicleNum;
    });
    
    if (!template) {
      const anyTemplate = targetJob.more_details[0];
      if (!anyTemplate) {
        skipped++;
        skippedVehicles.push({ vehicle, route, month: 'October', reason: 'No template found' });
        return;
      }
      
      const vehicleNum = extractVehicleNumber(vehicle);
      const routeCode = extractRouteCode(route) || extractRouteCode(vehicle);
      const newTemplate = { ...anyTemplate };
      if (vehicleNum) {
        newTemplate.Vehicle = vehicleName || `${vehicleNum.replace(/(\d{2})([A-Z]+)(\d{4})/, 'GJ $1 $2 $3')} RUT ${routeCode || ''}`;
      }
      
      const existingDates = new Set();
      targetJob.more_details.forEach(d => {
        if (d.Date) existingDates.add(d.Date.split(' ')[0]);
      });
      
      for (let day = 1; day <= 31; day++) {
        const date = `2025-10-${day.toString().padStart(2, '0')} 23:30:00`;
        const dateKey = date.split(' ')[0];
        
        if (!existingDates.has(dateKey)) {
          const missed = missedCheckpoints[day - 1] || 0;
          const record = generateDailyRecord(newTemplate, date, missed);
          record.Vehicle = newTemplate.Vehicle;
          targetJob.more_details.push(record);
          existingDates.add(dateKey);
          octoberAdded++;
        }
      }
      
      matchedVehicles.add(vehicle);
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
    
    matchedVehicles.add(vehicle);
    
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
  console.log(`✅ Matched vehicles: ${matchedVehicles.size}`);
  console.log(`⚠️  Skipped vehicles: ${skipped}`);
  
  if (skippedVehicles.length > 0 && skippedVehicles.length <= 50) {
    console.log('\n⚠️  Skipped vehicles list:');
    skippedVehicles.forEach(({ vehicle, route, month, reason }) => {
      console.log(`  - ${month}: ${vehicle} (${route}) - ${reason}`);
    });
  } else if (skippedVehicles.length > 50) {
    console.log(`\n⚠️  ${skippedVehicles.length} vehicles were skipped (too many to list)`);
    console.log('Sample skipped vehicles:');
    skippedVehicles.slice(0, 10).forEach(({ vehicle, route, month, reason }) => {
      console.log(`  - ${month}: ${vehicle} (${route}) - ${reason}`);
    });
  }
  
  return { septemberAdded, octoberAdded, skipped, matchedVehicles: matchedVehicles.size };
}

function main() {
  try {
    console.log('🚀 Starting improved September and October data addition process...\n');
    
    // Step 1: Restore backups
    restoreBackups();
    
    // Step 2: Build comprehensive vehicle mapping
    const { vehicleMap, routeMap } = buildVehicleMapping();
    
    // Step 3: Read source files
    const septemberVehicles = readSeptemberCSV();
    const octoberVehicles = readOctoberExcel();
    
    // Step 4: Add data to zones with better matching
    addDataToZones(septemberVehicles, octoberVehicles, vehicleMap, routeMap);
    
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

