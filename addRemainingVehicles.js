const fs = require('fs');
const XLSX = require('xlsx');

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

// Build comprehensive mapping including job names
function buildComprehensiveMapping() {
  console.log('🔍 Building comprehensive mapping (including job names)...');
  
  const zoneFiles = [
    { path: 'data/eastZone.json', zone: 'EAST_ZONE' },
    { path: 'data/wastZone.json', zone: 'WEST_ZONE' },
    { path: 'data/general.json', zone: 'General' },
    { path: 'data/brigrajsinh.json', zone: 'WEST_ZONE', isBrigrajsinh: true }
  ];
  
  const vehicleMap = new Map(); // vehicleNumber -> { zone, job, path, vehicleName }
  const routeMap = new Map(); // routeCode -> { zone, job, path, vehicleName }
  const jobNameMap = new Map(); // jobName -> { zone, job, path, vehicleName }
  
  zoneFiles.forEach(({ path, zone, isBrigrajsinh }) => {
    if (!fs.existsSync(path)) {
      console.log(`⚠️  File not found: ${path}`);
      return;
    }
    
    console.log(`📖 Reading ${path}...`);
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    data.forEach(job => {
      const jobName = job["Job Name"];
      
      // Map by job name (route code)
      if (jobName) {
        const routeCode = extractRouteCode(jobName);
        if (routeCode && !jobNameMap.has(routeCode)) {
          // Find a vehicle in this job to get the vehicle name format
          let sampleVehicle = null;
          if (job.more_details && job.more_details.length > 0) {
            sampleVehicle = job.more_details[0].Vehicle;
          }
          jobNameMap.set(routeCode, {
            zone: isBrigrajsinh ? 'BRIGRAJSINH' : zone,
            job,
            path,
            vehicleName: sampleVehicle
          });
        }
      }
      
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
              // Map by route code from vehicle name
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
  
  console.log(`✅ Built mapping: ${vehicleMap.size} vehicles, ${routeMap.size} routes, ${jobNameMap.size} job names`);
  return { vehicleMap, routeMap, jobNameMap };
}

// Find vehicle with multiple strategies
function findVehicle(vehicle, route, vehicleMap, routeMap, jobNameMap) {
  // Strategy 1: Try vehicle number
  const vehicleNumber = extractVehicleNumber(vehicle);
  if (vehicleNumber && vehicleMap.has(vehicleNumber)) {
    return vehicleMap.get(vehicleNumber);
  }
  
  // Strategy 2: Try route code from route parameter
  const routeCode = extractRouteCode(route);
  if (routeCode) {
    if (routeMap.has(routeCode)) {
      return routeMap.get(routeCode);
    }
    // Also try job name map
    if (jobNameMap.has(routeCode)) {
      return jobNameMap.get(routeCode);
    }
  }
  
  // Strategy 3: Try route code from vehicle name
  const vehicleRouteCode = extractRouteCode(vehicle);
  if (vehicleRouteCode) {
    if (routeMap.has(vehicleRouteCode)) {
      return routeMap.get(vehicleRouteCode);
    }
    if (jobNameMap.has(vehicleRouteCode)) {
      return jobNameMap.get(vehicleRouteCode);
    }
  }
  
  // Strategy 4: Handle special cases like "W-11 R-10" format or search by job name
  if (vehicleNumber) {
    // Search all zones for this vehicle number
    const zoneFiles = [
      { path: 'data/eastZone.json', zone: 'EAST_ZONE' },
      { path: 'data/wastZone.json', zone: 'WEST_ZONE' },
      { path: 'data/general.json', zone: 'General' },
      { path: 'data/brigrajsinh.json', zone: 'BRIGRAJSINH' }
    ];
    
    for (const { path, zone } of zoneFiles) {
        if (!fs.existsSync(path)) continue;
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        for (const job of data) {
          const jobName = job["Job Name"] || '';
          
          // Check job name match by route code
          const jobRouteCode = extractRouteCode(jobName);
          if (routeCode && jobRouteCode && routeCode === jobRouteCode) {
            // Found by job name, now find vehicle in this job
            if (job.more_details) {
              for (const detail of job.more_details) {
                if (detail.Vehicle) {
                  const dVehicleNum = extractVehicleNumber(detail.Vehicle);
                  if (dVehicleNum === vehicleNumber) {
                    return {
                      zone: zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone,
                      job,
                      path,
                      vehicleName: detail.Vehicle
                    };
                  }
                }
              }
              // If vehicle not found but job matches, use first vehicle from job
              if (job.more_details.length > 0) {
                return {
                  zone: zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone,
                  job,
                  path,
                  vehicleName: job.more_details[0].Vehicle
                };
              }
            }
          }
          
          // Check for "W-11 R-10" format match
          if (route && route.includes('W-') && route.includes('R-')) {
            if (jobName.includes(route) || jobName.replace(/\s/g, '') === route.replace(/\s/g, '')) {
              if (job.more_details) {
                for (const detail of job.more_details) {
                  if (detail.Vehicle) {
                    const dVehicleNum = extractVehicleNumber(detail.Vehicle);
                    if (dVehicleNum === vehicleNumber) {
                      return {
                        zone: zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone,
                        job,
                        path,
                        vehicleName: detail.Vehicle
                      };
                    }
                  }
                }
                if (job.more_details.length > 0) {
                  return {
                    zone: zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone,
                    job,
                    path,
                    vehicleName: job.more_details[0].Vehicle
                  };
                }
              }
            }
          }
          
          // Search by vehicle number in job details
          if (job.more_details) {
            for (const detail of job.more_details) {
              if (detail.Vehicle) {
                const dVehicleNum = extractVehicleNumber(detail.Vehicle);
                if (dVehicleNum === vehicleNumber) {
                  return {
                    zone: zone === 'WEST_ZONE' && path.includes('brigrajsinh') ? 'BRIGRAJSINH' : zone,
                    job,
                    path,
                    vehicleName: detail.Vehicle
                  };
                }
              }
            }
          }
        }
      }
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

// Add data for specific vehicles only
function addDataForSpecificVehicles(septemberVehicles, octoberVehicles, vehicleMap, routeMap, jobNameMap) {
  console.log('\n🔄 Processing ONLY the 4 skipped vehicles...');
  
  // Filter to only the vehicles we need to process
  const targetVehicles = ['GJ04GB0610', 'GJ04GB0182', 'GJ04GA0780', 'GJ04GB0482'];
  
  const septFiltered = septemberVehicles.filter(v => 
    targetVehicles.some(tv => extractVehicleNumber(v.vehicle) === tv)
  );
  const octFiltered = octoberVehicles.filter(v => 
    targetVehicles.some(tv => extractVehicleNumber(v.vehicle) === tv)
  );
  
  console.log(`📋 Found ${septFiltered.length} September records for target vehicles`);
  console.log(`📋 Found ${octFiltered.length} October records for target vehicles`);
  
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
  console.log('\n📅 Processing September data for target vehicles...');
  septFiltered.forEach(({ vehicle, route, missedCheckpoints }) => {
    const match = findVehicle(vehicle, route, vehicleMap, routeMap, jobNameMap);
    
    if (!match) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'September', reason: 'No match found' });
      console.log(`  ❌ No match: ${vehicle} (${route})`);
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
    
    // Find template record for this vehicle
    const vehicleNumber = extractVehicleNumber(vehicle);
    const template = targetJob.more_details.find(d => {
      const dVehicleNum = extractVehicleNumber(d.Vehicle);
      return dVehicleNum && vehicleNumber && dVehicleNum === vehicleNumber;
    });
    
    if (!template) {
      // Use any template from this job
      const anyTemplate = targetJob.more_details[0];
      if (!anyTemplate) {
        skipped++;
        skippedVehicles.push({ vehicle, route, month: 'September', reason: 'No template found' });
        return;
      }
      
      // Create template with correct vehicle name
      const newTemplate = { ...anyTemplate };
      newTemplate.Vehicle = vehicleName || vehicle;
      
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
      
      console.log(`  ✅ Added September data for ${vehicle} to ${zone}`);
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
        record.Vehicle = template.Vehicle;
        targetJob.more_details.push(record);
        existingDates.add(dateKey);
        septemberAdded++;
      }
    }
    
    console.log(`  ✅ Added September data for ${vehicle} to ${zone}`);
    
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
  console.log('\n📅 Processing October data for target vehicles...');
  octFiltered.forEach(({ vehicle, route, missedCheckpoints }) => {
    const match = findVehicle(vehicle, route, vehicleMap, routeMap, jobNameMap);
    
    if (!match) {
      skipped++;
      skippedVehicles.push({ vehicle, route, month: 'October', reason: 'No match found' });
      console.log(`  ❌ No match: ${vehicle} (${route})`);
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
    const vehicleNumber = extractVehicleNumber(vehicle);
    const template = targetJob.more_details.find(d => {
      const dVehicleNum = extractVehicleNumber(d.Vehicle);
      return dVehicleNum && vehicleNumber && dVehicleNum === vehicleNumber;
    });
    
    if (!template) {
      const anyTemplate = targetJob.more_details[0];
      if (!anyTemplate) {
        skipped++;
        skippedVehicles.push({ vehicle, route, month: 'October', reason: 'No template found' });
        return;
      }
      
      const newTemplate = { ...anyTemplate };
      newTemplate.Vehicle = vehicleName || vehicle;
      
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
      
      console.log(`  ✅ Added October data for ${vehicle} to ${zone}`);
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
        record.Vehicle = template.Vehicle;
        targetJob.more_details.push(record);
        existingDates.add(dateKey);
        octoberAdded++;
      }
    }
    
    console.log(`  ✅ Added October data for ${vehicle} to ${zone}`);
    
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
  
  if (skippedVehicles.length > 0) {
    console.log('\n⚠️  Skipped vehicles:');
    skippedVehicles.forEach(({ vehicle, route, month, reason }) => {
      console.log(`  - ${month}: ${vehicle} (${route}) - ${reason}`);
    });
  }
  
  return { septemberAdded, octoberAdded, skipped };
}

function main() {
  try {
    console.log('🚀 Processing ONLY the 4 skipped vehicles with thorough matching...\n');
    
    // Step 1: Build comprehensive mapping
    const { vehicleMap, routeMap, jobNameMap } = buildComprehensiveMapping();
    
    // Step 2: Read source files
    const septemberVehicles = readSeptemberCSV();
    const octoberVehicles = readOctoberExcel();
    
    // Step 3: Add data for specific vehicles only
    addDataForSpecificVehicles(septemberVehicles, octoberVehicles, vehicleMap, routeMap, jobNameMap);
    
    console.log('\n🎉 Process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, addDataForSpecificVehicles };

