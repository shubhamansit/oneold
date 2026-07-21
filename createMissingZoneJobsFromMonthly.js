/**
 * Create zone jobs for monthly vehicles that have no matching Job Name yet,
 * then attach available monthly more_details rows.
 *
 * Usage:
 *   node createMissingZoneJobsFromMonthly.js [year month]
 *   node createMissingZoneJobsFromMonthly.js 2026 6
 *
 * If year/month omitted, scans all monthlyData_*.json and creates jobs for any orphans.
 */
const fs = require('fs');
const { jobMatchesMonthlyVehicle } = require('./zoneAppendMatching');

const ZONE_FILES = [
  { path: 'data/wastZone.json', name: 'wastZone', zone: 'WEST_ZONE' },
  { path: 'data/eastZone.json', name: 'eastZone', zone: 'EAST_ZONE' },
  { path: 'data/general.json', name: 'general', zone: 'General' },
  { path: 'data/brigrajsinh.json', name: 'brigrajsinh', zone: null },
];

/** Infer zone file + ward from route code using neighboring jobs / known prefixes */
function inferPlacement(routeCode, zoneSnapshots) {
  if (!routeCode) return null;

  // Special kitchen routes → general
  if (/^[WE]-\d+-\d{4}$/i.test(routeCode)) {
    return {
      filePath: 'data/general.json',
      zoneName: 'general',
      Zone: 'General',
      Ward: 'General',
      jobSuffix: 'KICHAN-',
    };
  }

  const prefix2 = routeCode.split('-').slice(0, 2).join('-'); // e.g. 01-12, 07-12

  // Prefer ward/zone of an existing job with same XX-YY prefix
  for (const snap of zoneSnapshots) {
    for (const rec of snap.data) {
      const jobName = rec['Job Name'] || '';
      const m = jobName.match(/(\d{2}-\d{2})-\d{4}/);
      if (m && m[1] === prefix2 && rec.Zone && rec.Zone !== '--') {
        const suffixMatch = jobName.replace(routeCode, '').match(/\s+(.+)$/);
        return {
          filePath: snap.path,
          zoneName: snap.name,
          Zone: rec.Zone,
          Ward: rec.Ward || '--',
          Company: rec.Company,
          jobSuffix: suffixMatch ? suffixMatch[1].trim() : 'G V P-',
        };
      }
    }
  }

  // Fallback by ward group conventions used in this project
  const westPrefixes = new Set([
    '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08', '01-09', '01-10', '01-11', '01-12',
    '02-01', '02-02', '02-03', '02-04', '02-05', '02-06', '02-07', '02-08', '02-09',
    '03-01', '03-02', '03-03', '03-04', '03-05', '03-06', '03-07', '03-08', '03-09',
    '04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07', '04-08', '04-09', '04-10', '04-11', '04-12',
    '05-01', '05-02', '05-03', '05-04', '05-05', '05-06', '05-07', '05-08', '05-09', '05-10',
    '06-01', '06-02', '06-03', '06-04', '06-05', '06-06', '06-07', '06-08', '06-09', '06-10', '06-11', '06-12', '06-13',
    '08-01', '08-02', '08-03', '08-04', '08-05', '08-06', '08-07', '08-08', '08-09', '08-10',
  ]);
  const eastPrefixes = new Set([
    '07-01', '07-02', '07-03', '07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10', '07-11', '07-12',
    '09-01', '09-02', '09-03', '09-04', '09-05', '09-06', '09-07', '09-08', '09-09', '09-10',
    '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07', '10-08', '10-09', '10-10', '10-11', '10-12', '10-13', '10-14',
    '11-01', '11-02', '11-03', '11-04', '11-05', '11-06', '11-07', '11-08', '11-09', '11-10',
    '12-01', '12-02', '12-03', '12-04', '12-05', '12-06', '12-07', '12-08', '12-09', '12-10', '12-11',
    '13-01', '13-02', '13-03', '13-04', '13-05', '13-06', '13-07', '13-08', '13-09', '13-10', '13-11', '13-12', '13-13',
  ]);

  if (westPrefixes.has(prefix2) || routeCode.startsWith('01-') || routeCode.startsWith('02-')) {
    const ward =
      routeCode.startsWith('01-') ? 'CHITRA FULSER NARI' :
      routeCode.startsWith('02-') ? 'KUMBHARWADA' :
      'WEST_ZONE';
    return {
      filePath: 'data/wastZone.json',
      zoneName: 'wastZone',
      Zone: 'WEST_ZONE',
      Ward: ward,
      jobSuffix: 'G V P-',
    };
  }

  if (eastPrefixes.has(prefix2) || routeCode.startsWith('07-')) {
    return {
      filePath: 'data/eastZone.json',
      zoneName: 'eastZone',
      Zone: 'EAST_ZONE',
      Ward: routeCode.startsWith('07-') ? 'TAKHATESWAR' : 'EAST_ZONE',
      jobSuffix: 'D TO D..',
    };
  }

  return null;
}

function extractRouteFromVehicle(vehicleName) {
  const std = vehicleName.match(/(\d{2}-\d{2}-\d{4})/);
  if (std) return std[1];
  const special = vehicleName.match(/([WE]-\d+-\d{4})/i);
  if (special) return special[1].toUpperCase();
  // E-1 / W-1 style without digits pattern in middle
  if (/E[\s-]*1/i.test(vehicleName)) {
    const num = vehicleName.match(/(\d{4})/);
    return num ? `E-1-${num[1]}` : null;
  }
  if (/W[\s-]*1/i.test(vehicleName)) {
    const num = vehicleName.match(/(\d{4})/);
    return num ? `W-1-${num[1]}` : null;
  }
  return null;
}

function isPlaceholder(record) {
  return (
    record.Branch === '--' &&
    record.Town === '--' &&
    record.Zone === '--' &&
    record.Ward === '--' &&
    record['Job Type'] === '--' &&
    record['Total Jobs'] === 0
  );
}

function loadAllMonthlyRecords(filterYear, filterMonth) {
  const files = fs.readdirSync('.').filter((f) => /^monthlyData_\d{4}_\d{2}\.json$/.test(f));
  const byVehicle = new Map();

  files.forEach((file) => {
    const m = file.match(/monthlyData_(\d{4})_(\d{2})\.json/);
    if (!m) return;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    if (filterYear && y !== filterYear) return;
    // When a specific month is requested, still load ALL months for that vehicle once job is created
    // so May orphans also get May+June when fixing for June. Load everything.
    void mo;

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.forEach((rec) => {
      if (!rec.Vehicle) return;
      if (!byVehicle.has(rec.Vehicle)) byVehicle.set(rec.Vehicle, []);
      byVehicle.get(rec.Vehicle).push(rec);
    });
  });

  // If filterYear/month given, only create jobs for vehicles that appear in that month
  let focusVehicles = null;
  if (filterYear && filterMonth) {
    const monthStr = String(filterMonth).padStart(2, '0');
    const focusFile = `monthlyData_${filterYear}_${monthStr}.json`;
    if (fs.existsSync(focusFile)) {
      const focus = JSON.parse(fs.readFileSync(focusFile, 'utf8'));
      focusVehicles = new Set(focus.map((r) => r.Vehicle));
    }
  }

  return { byVehicle, focusVehicles };
}

function createMissingZoneJobsFromMonthly(year, month) {
  const { byVehicle, focusVehicles } = loadAllMonthlyRecords(year, month);

  const zoneSnapshots = ZONE_FILES.map(({ path, name }) => ({
    path,
    name,
    data: JSON.parse(fs.readFileSync(path, 'utf8')),
  }));

  const allJobNames = [];
  zoneSnapshots.forEach((snap) => {
    snap.data.forEach((rec) => {
      if (isPlaceholder(rec)) return;
      if (rec['Job Name']) allJobNames.push(rec['Job Name']);
    });
  });

  // Strict orphan check: require an exact route-code job (avoid false hits via plate-only match)
  function hasStrictJobMatch(vehicleName) {
    const routeCode = extractRouteFromVehicle(vehicleName);
    if (routeCode) {
      return allJobNames.some((jobName) => {
        const jobRoute = (jobName.match(/(\d{2}-\d{2}-\d{4})/) || [])[0]
          || (jobName.match(/([WE]-\d+-\d{4})/i) || [])[0];
        return jobRoute && jobRoute.toUpperCase() === routeCode.toUpperCase();
      });
    }
    // No route on vehicle — fall back to shared matcher
    return allJobNames.some((jobName) => jobMatchesMonthlyVehicle(jobName, vehicleName));
  }

  const orphans = [];
  for (const vehicleName of byVehicle.keys()) {
    if (focusVehicles && !focusVehicles.has(vehicleName)) continue;
    if (!hasStrictJobMatch(vehicleName)) orphans.push(vehicleName);
  }

  console.log(`Found ${orphans.length} monthly vehicle(s) with no zone job`);
  if (orphans.length === 0) return { created: 0, orphans: [] };

  const created = [];
  const fileUpdates = new Map(); // path -> data array

  orphans.forEach((vehicleName) => {
    const routeCode = extractRouteFromVehicle(vehicleName);
    const placement = inferPlacement(routeCode, zoneSnapshots);
    if (!placement) {
      console.log(`⚠️  Cannot infer zone for: ${vehicleName} (route: ${routeCode || 'N/A'})`);
      return;
    }

    const details = [...byVehicle.get(vehicleName)].sort((a, b) =>
      String(a.Date).localeCompare(String(b.Date))
    );
    const jobName = `${routeCode} ${placement.jobSuffix}`.replace(/\s+/g, ' ').trim();

    // Skip if somehow job name already exists in target file
    const snap = zoneSnapshots.find((s) => s.path === placement.filePath);
    if (snap.data.some((r) => r['Job Name'] === jobName)) {
      console.log(`⚠️  Job already exists, skipping create: ${jobName}`);
      return;
    }

    const newJob = {
      ...(placement.Company ? { Company: placement.Company } : { Company: 'BMC' }),
      Branch: 'BMC',
      Town: 'BHAVNAGAR_OSC',
      Zone: placement.Zone,
      Ward: placement.Ward,
      'Job Name': jobName,
      'Job Type': 'Waste Collection',
      'Total Jobs': details.length,
      Completed: details.length,
      'Completed With Issue': details.filter((d) => (d['Missed Checkpoints'] || 0) > 0).length,
      Failed: 0,
      Penalty: 0,
      'Assigned Helpers': 0,
      more_details: details,
    };

    if (!fileUpdates.has(placement.filePath)) {
      fileUpdates.set(placement.filePath, snap.data);
    }
    fileUpdates.get(placement.filePath).push(newJob);

    created.push({
      vehicle: vehicleName,
      jobName,
      zone: placement.zoneName,
      days: details.length,
      dateRange: details.length
        ? `${details[0].Date.split(' ')[0]} → ${details[details.length - 1].Date.split(' ')[0]}`
        : 'n/a',
    });
    console.log(
      `✅ Created [${placement.zoneName}] "${jobName}" ← ${vehicleName} (${details.length} days)`
    );
  });

  fileUpdates.forEach((data, filePath) => {
    const backupPath = `${filePath}.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Updated ${filePath} (backup: ${backupPath})`);
  });

  console.log(`\n📊 Created ${created.length} new zone job(s)`);
  return { created: created.length, orphans: created };
}

function main() {
  const args = process.argv.slice(2);
  let year = null;
  let month = null;
  if (args.length >= 2) {
    year = parseInt(args[0], 10);
    month = parseInt(args[1], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      console.error('Invalid year or month');
      process.exit(1);
    }
  }

  createMissingZoneJobsFromMonthly(year, month);
}

if (require.main === module) {
  main();
}

module.exports = { createMissingZoneJobsFromMonthly };
