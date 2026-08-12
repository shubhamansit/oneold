const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

/**
 * Convert one or more daily "Job Detail Summary" Excel files into monthlyData_YYYY_MM.json
 * records (same shape as excelToMonthlyData.js output).
 *
 * Usage:
 *   node jobDetailToMonthlyData.js 2026 8 "data/Job_Detail_Summary_08-08-2026.xlsx" "data/Job_Detail_Summary_09-08-2026.xlsx"
 */

function routeFromVehicle(vehicle) {
  const s = String(vehicle || '');
  // RUT/ROUTE with optional space: "RUT 01-04-0137", "ROUTE01-02-0283", "RUT01-03-0107"
  let m = s.match(/(?:RUT|ROUTE)\s*(\d{2}-\d{2}-\d{4}|[WE]-\d+-\d{4})/i);
  if (m) return m[1];
  // Special kitchen routes: "E-1" / "W-1" near plate
  m = s.match(/\b([WE])-?1\b/i);
  if (m) {
    const plate = (s.match(/\b(\d{4})\b/) || [])[1];
    if (plate) return `${m[1].toUpperCase()}-1-${plate}`;
  }
  // Bare route code anywhere in vehicle string
  m = s.match(/(\d{2}-\d{2}-\d{4})/);
  if (m) return m[1];
  return null;
}

function routeFromJobName(jobName) {
  const m = String(jobName || '').match(/(\d{2}-\d{2}-\d{4}|[WE]-\d+-\d{4})/);
  return m ? m[1] : null;
}

function routesContainedInText(text) {
  const s = String(text || '');
  const out = new Set();
  const re = /(\d{2}-\d{2}-\d{4}|[WE]-\d+-\d{4})/gi;
  let m;
  while ((m = re.exec(s))) out.add(m[1].toUpperCase().replace(/^([WE])-(\d+)-/i, (_, a, b) => `${a.toUpperCase()}-${b}-`));
  // normalize E-1-0309 style already captured; also W1 / E1 loose forms handled via routeFromVehicle
  return out;
}

function templateFromZoneJob(job) {
  const md = (job.more_details || []).find((d) => d && d.Vehicle) || (job.more_details || [])[0];
  if (!md) return null;
  return { ...md, Vehicle: md.Vehicle };
}

function parseDdMmYyyy(dateStr) {
  // "08-08-2026" or "08/08/2026"
  const s = String(dateStr || '').trim();
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return { year, month, day };
}

function indexTemplate(byRoute, byVehicle, template, { overwrite = false } = {}) {
  if (!template || !template.Vehicle) return;
  byVehicle.set(template.Vehicle, template);

  const primary = routeFromVehicle(template.Vehicle);
  if (primary && (overwrite || !byRoute.has(primary))) byRoute.set(primary, template);

  // Also index every route-looking token in the vehicle string / job context
  for (const route of routesContainedInText(template.Vehicle)) {
    if (overwrite || !byRoute.has(route)) byRoute.set(route, template);
  }
}

function loadVehicleIndex() {
  const templates = JSON.parse(fs.readFileSync('vehicleTemplates.json', 'utf8'));
  const byRoute = new Map();
  const byVehicle = new Map();

  for (const t of templates) indexTemplate(byRoute, byVehicle, t);

  // Prefer latest known monthly vehicles when templates are incomplete / stale
  for (const monthlyFile of [
    'monthlyData_2026_07.json',
    'monthlyData_2026_06.json',
    'monthlyData_2026_05.json',
  ]) {
    if (!fs.existsSync(monthlyFile)) continue;
    const rows = JSON.parse(fs.readFileSync(monthlyFile, 'utf8'));
    const seen = new Set();
    for (const r of rows) {
      if (!r.Vehicle || seen.has(r.Vehicle)) continue;
      seen.add(r.Vehicle);
      indexTemplate(byRoute, byVehicle, r, { overwrite: true });
    }
  }

  // Zone jobs as fallback for vehicles missing from templates/monthly
  for (const zoneFile of [
    'data/wastZone.json',
    'data/eastZone.json',
    'data/general.json',
    'data/brigrajsinh.json',
  ]) {
    if (!fs.existsSync(zoneFile)) continue;
    const jobs = JSON.parse(fs.readFileSync(zoneFile, 'utf8'));
    for (const job of jobs) {
      const jobRoute = routeFromJobName(job['Job Name']);
      const template = templateFromZoneJob(job);
      if (!template) continue;
      indexTemplate(byRoute, byVehicle, template);
      if (jobRoute && !byRoute.has(jobRoute)) byRoute.set(jobRoute, template);
    }
  }

  return { byRoute, byVehicle };
}

function headerIndexMap(headerRow) {
  const map = {};
  (headerRow || []).forEach((h, i) => {
    if (h == null || String(h).trim() === '') return;
    map[String(h).trim()] = i;
  });
  return map;
}

function readJobDetailFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (!rows.length) return [];

  const idx = headerIndexMap(rows[0]);
  const required = [
    'Job Name',
    'Start Date',
    'Planned Checkpoints',
    'Total Visited Checkpoints',
    'Missed Checkpoints',
  ];
  for (const key of required) {
    if (idx[key] == null) {
      throw new Error(`${filePath}: missing column "${key}". Found: ${Object.keys(idx).join(', ')}`);
    }
  }

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const jobName = row[idx['Job Name']];
    if (jobName == null || String(jobName).trim() === '') continue;

    const planned = Number(row[idx['Planned Checkpoints']]) || 0;
    const visited = Number(row[idx['Total Visited Checkpoints']]);
    const missed = Number(row[idx['Missed Checkpoints']]) || 0;
    const pctRaw = row[idx['Checkpoints Complete Status(%)']];
    const pct =
      pctRaw != null && pctRaw !== ''
        ? Number(pctRaw)
        : planned > 0
          ? Math.round(((Number.isFinite(visited) ? visited : planned - missed) / planned) * 100)
          : 0;

    out.push({
      sourceFile: path.basename(filePath),
      jobName: String(jobName).trim(),
      route: routeFromJobName(jobName),
      startDate: row[idx['Start Date']],
      planned,
      visited: Number.isFinite(visited) ? visited : Math.max(0, planned - missed),
      missed,
      pct: Number.isFinite(pct) ? pct : 0,
    });
  }
  return out;
}

function cloneTemplateForDay(template, dateParts, dayStats) {
  const { year, month, day } = dateParts;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const startPart = String(template['Actual Start Time'] || '2026-01-01 05:30:00').split(' ')[1] || '05:30:00';
  const endPart = String(template['Actual End Time'] || '2026-01-01 11:30:00').split(' ')[1] || '11:30:00';

  const planned = dayStats.planned;
  const missed = dayStats.missed;
  const visited =
    dayStats.visited != null ? dayStats.visited : Math.max(0, planned - missed);
  const delays = template.Delay || 0;
  const onTime = Math.max(0, visited - delays);
  const completion =
    dayStats.pct != null
      ? dayStats.pct
      : planned > 0
        ? Math.round((visited / planned) * 100)
        : 0;

  const estimatedDistance = template['Estimated Distance'] || 20;
  // Keep distance stable (no random) so re-runs are deterministic
  const actualDistance = template.Distance != null ? template.Distance : estimatedDistance;
  const distanceCompleted =
    estimatedDistance > 0 ? Math.round((actualDistance / estimatedDistance) * 100) : 0;

  return {
    ...template,
    Date: `${dateStr} 23:30:00`,
    'Start Time': `${dateStr} 00:00:00`,
    'End Time': `${dateStr} 18:00:00`,
    'Actual Start Time': `${dateStr} ${startPart}`,
    'Actual End Time': `${dateStr} ${endPart}`,
    'Planned Checkpoints': planned,
    'On-Time': onTime,
    Early: template.Early || 0,
    Delay: delays,
    'Total Visited Checkpoints': visited,
    'Missed Checkpoints': missed,
    'Checkpoints Complete Status(%)': completion,
    Distance: actualDistance,
    'Distance Completed %': distanceCompleted,
  };
}

function mergeIntoExisting(existingRows, newRows) {
  // Key by Vehicle + Date (YYYY-MM-DD)
  const keyOf = (r) => `${r.Vehicle}||${String(r.Date).slice(0, 10)}`;
  const map = new Map();
  for (const r of existingRows) map.set(keyOf(r), r);
  for (const r of newRows) map.set(keyOf(r), r); // overwrite same day
  return Array.from(map.values()).sort((a, b) => {
    const da = String(a.Date).localeCompare(String(b.Date));
    if (da !== 0) return da;
    return String(a.Vehicle).localeCompare(String(b.Vehicle));
  });
}

function createSyntheticTemplate(route, planned) {
  const parts = String(route).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const special = String(route).match(/^([WE])-(\d+)-(\d{4})$/i);
  let vehicle;
  if (parts) {
    vehicle = `GJ 04 GB ${parts[3]} RUT ${route}`;
  } else if (special) {
    vehicle = `GJ 06 BX ${special[3]} ${special[1].toUpperCase()}-${special[2]}`;
  } else {
    vehicle = `UNKNOWN RUT ${route}`;
  }

  return {
    Date: '2026-01-01 23:30:00',
    Vehicle: vehicle,
    'Start Time': '2026-01-01 00:00:00',
    'End Time': '2026-01-01 18:00:00',
    'Actual Start Time': '2026-01-01 05:30:00',
    'Actual End Time': '2026-01-01 11:30:00',
    'Planned Checkpoints': planned || 50,
    'On-Time': 0,
    Early: 0,
    Delay: 0,
    'Total Visited Checkpoints': 0,
    'Missed Checkpoints': 0,
    'Checkpoints Complete Status(%)': 0,
    'Estimated Distance': 20,
    Distance: 20,
    'Distance Completed %': 100,
    'On Route': 0,
    'On Route %': 100,
    'Off Route': 0,
    'Off Route %': 0,
    'Early Arrival Condition(Minute)': '0:00',
    'Delay Arrival Condition(Minute)': '0:00',
    'Group Name': '--',
    Penalty: 0,
    Reason: '--',
    Remark: '--',
    Assigned: '--',
    Present: '--',
    'Waste Weight': 0,
    Incidents: 0,
    avg_halt_time: '3:30',
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log(
      'Usage: node jobDetailToMonthlyData.js <year> <month> <excel1> [excel2 ...]'
    );
    console.log(
      'Example: node jobDetailToMonthlyData.js 2026 8 "data/Job_Detail_Summary_08-08-2026.xlsx" "data/Job_Detail_Summary_09-08-2026.xlsx"'
    );
    process.exit(1);
  }

  const year = parseInt(args[0], 10);
  const month = parseInt(args[1], 10);
  const files = args.slice(2);

  console.log(`Converting ${files.length} Job Detail Summary file(s) -> monthlyData_${year}_${String(month).padStart(2, '0')}.json`);

  const { byRoute } = loadVehicleIndex();
  const generated = [];
  const unmatched = [];
  const synthesized = [];
  const dateMismatch = [];

  for (const file of files) {
    console.log(`\nReading ${file}`);
    const jobs = readJobDetailFile(file);
    console.log(`  rows: ${jobs.length}`);

    for (const job of jobs) {
      const parsed = parseDdMmYyyy(job.startDate);
      if (!parsed) {
        unmatched.push({ ...job, reason: `bad date: ${job.startDate}` });
        continue;
      }
      if (parsed.year !== year || parsed.month !== month) {
        dateMismatch.push(job);
        continue;
      }
      if (!job.route) {
        unmatched.push({ ...job, reason: 'no route in job name' });
        continue;
      }

      let template = byRoute.get(job.route);
      if (!template) {
        template = createSyntheticTemplate(job.route, job.planned);
        byRoute.set(job.route, template);
        synthesized.push({ route: job.route, vehicle: template.Vehicle, jobName: job.jobName });
      }

      generated.push(
        cloneTemplateForDay(template, parsed, {
          planned: job.planned,
          visited: job.visited,
          missed: job.missed,
          pct: job.pct,
        })
      );
    }
  }

  const outFile = `monthlyData_${year}_${String(month).padStart(2, '0')}.json`;
  let existing = [];
  if (fs.existsSync(outFile)) {
    existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    console.log(`\nMerging into existing ${outFile} (${existing.length} rows)`);
  }

  const merged = mergeIntoExisting(existing, generated);
  fs.writeFileSync(outFile, JSON.stringify(merged, null, 2), 'utf8');

  const byDate = {};
  for (const r of generated) {
    const d = String(r.Date).slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;
  }

  console.log(`\nGenerated new day records: ${generated.length}`);
  console.log('Per date:', byDate);
  console.log(`Saved: ${outFile} (total ${merged.length} rows)`);
  console.log(`Unmatched jobs: ${unmatched.length}`);
  if (unmatched.length) {
    console.log(
      unmatched
        .slice(0, 30)
        .map((u) => `  ${u.route || '?'} | ${u.jobName} | ${u.reason}`)
        .join('\n')
    );
  }
  if (synthesized.length) {
    const unique = [...new Map(synthesized.map((s) => [s.route, s])).values()];
    console.log(`Synthesized templates for ${unique.length} new route(s):`);
    for (const s of unique) console.log(`  ${s.route} -> ${s.vehicle}`);
  }
  if (dateMismatch.length) {
    console.log(`Skipped wrong-month rows: ${dateMismatch.length}`);
  }

  // Quick consistency: excel missed totals vs monthly for those days
  for (const [date, count] of Object.entries(byDate)) {
    const dayRows = merged.filter((r) => String(r.Date).startsWith(date));
    const missedSum = dayRows.reduce((s, r) => s + (Number(r['Missed Checkpoints']) || 0), 0);
    console.log(`  ${date}: ${count} vehicles, missed-sum=${missedSum}`);
  }
}

main();
