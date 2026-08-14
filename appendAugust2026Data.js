const fs = require('fs');
const path = require('path');
const { jobMatchesMonthlyVehicle } = require('./zoneAppendMatching');

/**
 * Append monthlyData_2026_08.json into zone more_details (overwrite same dates).
 * Prefers exact route match on the vehicle string to avoid shared-plate collisions.
 */
function routeFromJobName(jobName) {
  const special = String(jobName || '').match(/([WE]-\d+-\d{4})/i);
  if (special) return special[1];
  const m = String(jobName || '').match(/(\d{2}-\d{2}-\d{4})/);
  return m ? m[1] : null;
}

function routeFromVehicle(vehicle) {
  const s = String(vehicle || '');
  let m = s.match(/(?:RUT|ROUTE)\s*(\d{2}-\d{2}-\d{4}|[WE]-\d+-\d{4})/i);
  if (m) return m[1];
  m = s.match(/\b([WE])-?1\b/i);
  if (m) {
    const plate = (s.match(/\b(\d{4})\b/) || [])[1];
    if (plate) return `${m[1].toUpperCase()}-1-${plate}`;
  }
  m = s.match(/(\d{2}-\d{2}-\d{4})/);
  return m ? m[1] : null;
}

function pickMonthlyVehicle(jobName, vehicleMap) {
  const route = routeFromJobName(jobName);
  const vehicles = [...vehicleMap.keys()];

  if (route) {
    const exact = vehicles.find((v) => {
      const vr = routeFromVehicle(v);
      return vr === route || String(v).includes(route);
    });
    if (exact) return exact;

    // Partial: plate + XX-YY together (e.g. "GJ 04 GB 0426 01-08 - ENTRA")
    const parts = route.match(/^(\d{2}-\d{2})-(\d{4})$/);
    if (parts) {
      const soft = vehicles.find(
        (v) => String(v).includes(parts[1]) && String(v).includes(parts[2])
      );
      if (soft) return soft;
    }

    const special = route.match(/^([WE]-\d+)-(\d{4})$/i);
    if (special) {
      const soft = vehicles.find(
        (v) =>
          String(v).includes(special[2]) &&
          (String(v).includes(special[1]) ||
            String(v).toUpperCase().includes(special[1].replace('-', '')))
      );
      if (soft) return soft;
    }
  }

  return vehicles.find((v) => jobMatchesMonthlyVehicle(jobName, v)) || null;
}

function appendAugust2026Data() {
  try {
    console.log('Appending August 2026 data to zone JSON files...');

    const augustFile = 'monthlyData_2026_08.json';
    if (!fs.existsSync(augustFile)) {
      console.error(`August 2026 data file not found: ${augustFile}`);
      return false;
    }

    const augustData = JSON.parse(fs.readFileSync(augustFile, 'utf8'));
    console.log(`Loaded August 2026 data: ${augustData.length} records`);

    const augustVehicleMap = new Map();
    augustData.forEach((record) => {
      if (!augustVehicleMap.has(record.Vehicle)) {
        augustVehicleMap.set(record.Vehicle, []);
      }
      augustVehicleMap.get(record.Vehicle).push(record);
    });
    console.log(`Unique vehicles in August 2026: ${augustVehicleMap.size}`);

    const backupDir = path.join('data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const zoneFiles = [
      { path: 'data/wastZone.json', name: 'wastZone' },
      { path: 'data/eastZone.json', name: 'eastZone' },
      { path: 'data/general.json', name: 'general' },
      { path: 'data/brigrajsinh.json', name: 'brigrajsinh' },
    ];

    let totalMappings = 0;
    let totalAppended = 0;
    const unmatchedJobs = [];
    const usedVehicles = new Set();

    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\nProcessing ${zoneName}...`);

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `${path.basename(filePath)}.backup.${stamp}`);
      const originalContent = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(backupPath, originalContent);
      console.log(`  Backup: ${backupPath}`);

      const data = JSON.parse(originalContent);
      console.log(`  Jobs: ${data.length}`);

      let zoneMappings = 0;
      let zoneAugustRows = 0;

      const updatedData = data.map((record) => {
        const updatedRecord = { ...record };

        const isPlaceholder =
          updatedRecord.Branch === '--' &&
          updatedRecord.Town === '--' &&
          updatedRecord.Zone === '--' &&
          updatedRecord.Ward === '--' &&
          updatedRecord['Job Type'] === '--' &&
          updatedRecord['Total Jobs'] === 0 &&
          updatedRecord.Completed === 0 &&
          updatedRecord['Completed With Issue'] === 0 &&
          updatedRecord.Failed === 0 &&
          updatedRecord.Penalty === 0 &&
          updatedRecord['Assigned Helpers'] === '--' &&
          updatedRecord.Incidents === 0;

        if (isPlaceholder) return updatedRecord;

        if (!Array.isArray(updatedRecord.more_details)) {
          updatedRecord.more_details = [];
        }

        const jobName = updatedRecord['Job Name'];
        if (!jobName || typeof jobName !== 'string') return updatedRecord;

        const existingDates = new Map();
        updatedRecord.more_details.forEach((detail) => {
          if (detail.Date) {
            existingDates.set(detail.Date.split(' ')[0], detail);
          }
        });

        const matchedVehicle = pickMonthlyVehicle(jobName, augustVehicleMap);
        if (!matchedVehicle) {
          unmatchedJobs.push({ zone: zoneName, jobName });
          updatedRecord.more_details = Array.from(existingDates.values()).sort((a, b) =>
            String(a.Date || '').localeCompare(String(b.Date || ''))
          );
          return updatedRecord;
        }

        usedVehicles.add(matchedVehicle);
        zoneMappings++;
        totalMappings++;

        const augustRecords = augustVehicleMap.get(matchedVehicle) || [];
        augustRecords.forEach((row) => {
          const dateKey = row.Date.split(' ')[0];
          existingDates.set(dateKey, row);
          totalAppended++;
        });

        updatedRecord.more_details = Array.from(existingDates.values()).sort((a, b) =>
          String(a.Date || '').localeCompare(String(b.Date || ''))
        );
        return updatedRecord;
      });

      updatedData.forEach((record) => {
        if (!record.more_details) return;
        const aug = record.more_details.filter(
          (d) => d.Date && d.Date.startsWith('2026-08')
        );
        if (aug.length) zoneAugustRows += aug.length;
      });

      console.log(`  Mappings: ${zoneMappings}`);
      console.log(`  August rows in zone after update: ${zoneAugustRows}`);

      fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
      console.log(`  Updated ${zoneName}`);
    });

    const orphanVehicles = [...augustVehicleMap.keys()].filter((v) => !usedVehicles.has(v));

    console.log(`\nAugust 2026 APPEND SUMMARY`);
    console.log(`  Successful mappings: ${totalMappings}`);
    console.log(`  Records written (incl. overwrites): ${totalAppended}`);
    console.log(`  Monthly vehicles unused (orphans): ${orphanVehicles.length}`);
    if (orphanVehicles.length) {
      orphanVehicles.forEach((v) => console.log(`    - ${v}`));
    }

    return true;
  } catch (error) {
    console.error('Error appending August 2026 data:', error);
    return false;
  }
}

if (require.main === module) {
  appendAugust2026Data();
}

module.exports = { appendAugust2026Data };
