const fs = require('fs');
const path = require('path');
const { jobMatchesMonthlyVehicle } = require('./zoneAppendMatching');

/**
 * Append monthlyData_2026_09.json into zone more_details (overwrite same dates).
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

function appendSeptember2026Data() {
  try {
    console.log('Appending September 2026 data to zone JSON files...');

    const septFile = 'monthlyData_2026_09.json';
    if (!fs.existsSync(septFile)) {
      console.error(`September 2026 data file not found: ${septFile}`);
      return false;
    }

    const septData = JSON.parse(fs.readFileSync(septFile, 'utf8'));
    console.log(`Loaded September 2026 data: ${septData.length} records`);

    const septVehicleMap = new Map();
    septData.forEach((record) => {
      if (!septVehicleMap.has(record.Vehicle)) {
        septVehicleMap.set(record.Vehicle, []);
      }
      septVehicleMap.get(record.Vehicle).push(record);
    });
    console.log(`Unique vehicles in September 2026: ${septVehicleMap.size}`);

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
    const usedVehicles = new Set();

    zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
      console.log(`\nProcessing ${zoneName}...`);

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        backupDir,
        `${path.basename(filePath)}.backup.${stamp}`
      );
      const originalContent = fs.readFileSync(filePath, 'utf8');
      fs.writeFileSync(backupPath, originalContent);
      console.log(`  Backup: ${backupPath}`);

      const data = JSON.parse(originalContent);
      console.log(`  Jobs: ${data.length}`);

      let zoneMappings = 0;
      let zoneSeptRows = 0;

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

        const matchedVehicle = pickMonthlyVehicle(jobName, septVehicleMap);
        if (!matchedVehicle) {
          updatedRecord.more_details = Array.from(existingDates.values()).sort(
            (a, b) => String(a.Date || '').localeCompare(String(b.Date || ''))
          );
          return updatedRecord;
        }

        usedVehicles.add(matchedVehicle);
        zoneMappings++;
        totalMappings++;

        const septRecords = septVehicleMap.get(matchedVehicle) || [];
        septRecords.forEach((row) => {
          const dateKey = row.Date.split(' ')[0];
          existingDates.set(dateKey, row);
          totalAppended++;
        });

        updatedRecord.more_details = Array.from(existingDates.values()).sort(
          (a, b) => String(a.Date || '').localeCompare(String(b.Date || ''))
        );
        return updatedRecord;
      });

      updatedData.forEach((record) => {
        if (!record.more_details) return;
        const sept = record.more_details.filter(
          (d) => d.Date && d.Date.startsWith('2026-09')
        );
        if (sept.length) zoneSeptRows += sept.length;
      });

      console.log(`  Mappings: ${zoneMappings}`);
      console.log(`  September rows in zone after update: ${zoneSeptRows}`);

      fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
      console.log(`  Updated ${zoneName}`);
    });

    const orphanVehicles = [...septVehicleMap.keys()].filter(
      (v) => !usedVehicles.has(v)
    );

    console.log(`\nSeptember 2026 APPEND SUMMARY`);
    console.log(`  Successful mappings: ${totalMappings}`);
    console.log(`  Records written (incl. overwrites): ${totalAppended}`);
    console.log(`  Monthly vehicles unused (orphans): ${orphanVehicles.length}`);
    if (orphanVehicles.length) {
      orphanVehicles.forEach((v) => console.log(`    - ${v}`));
    }

    return true;
  } catch (error) {
    console.error('Error appending September 2026 data:', error);
    return false;
  }
}

if (require.main === module) {
  appendSeptember2026Data();
}

module.exports = { appendSeptember2026Data };
