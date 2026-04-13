/**
 * Verify monthly JSON vehicles map to at least one real zone job, and flag zone jobs missing month rows.
 *
 * Usage: node verifyMonthlyAppendCoverage.js <year> <month>
 * Example: node verifyMonthlyAppendCoverage.js 2026 3
 */
const fs = require('fs');
const { jobMatchesMonthlyVehicle } = require('./zoneAppendMatching');

function isPlaceholder(record) {
  return (
    record.Branch === '--' &&
    record.Town === '--' &&
    record.Zone === '--' &&
    record.Ward === '--' &&
    record['Job Type'] === '--' &&
    record['Total Jobs'] === 0 &&
    record.Completed === 0 &&
    record['Completed With Issue'] === 0 &&
    record.Failed === 0 &&
    record.Penalty === 0 &&
    record['Assigned Helpers'] === '--' &&
    record.Incidents === 0
  );
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node verifyMonthlyAppendCoverage.js <year> <month>');
    console.log('Example: node verifyMonthlyAppendCoverage.js 2026 3');
    process.exit(1);
  }
  const year = parseInt(args[0], 10);
  const month = parseInt(args[1], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    console.error('Invalid year or month');
    process.exit(1);
  }

  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}`;
  const monthlyPath = `monthlyData_${year}_${monthStr}.json`;

  if (!fs.existsSync(monthlyPath)) {
    console.error(`Missing file: ${monthlyPath}`);
    process.exit(1);
  }

  const monthlyData = JSON.parse(fs.readFileSync(monthlyPath, 'utf8'));
  const monthlyVehicles = [...new Set(monthlyData.map((r) => r.Vehicle))];

  const zoneFiles = [
    { path: 'data/wastZone.json', name: 'wastZone' },
    { path: 'data/eastZone.json', name: 'eastZone' },
    { path: 'data/general.json', name: 'general' },
    { path: 'data/brigrajsinh.json', name: 'brigrajsinh' },
  ];

  const zoneJobs = [];
  zoneFiles.forEach(({ path: filePath, name: zoneName }) => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach((record, index) => {
      if (isPlaceholder(record)) return;
      const jobName = record['Job Name'];
      if (!jobName) return;
      const hasMd = Array.isArray(record.more_details);
      const monthRows = hasMd
        ? record.more_details.filter((d) => d.Date && d.Date.startsWith(datePrefix))
        : [];
      zoneJobs.push({
        zoneName,
        index,
        jobName,
        hasMd,
        monthRowCount: monthRows.length,
      });
    });
  });

  const orphans = [];
  monthlyVehicles.forEach((mv) => {
    const matched = zoneJobs.some((j) => jobMatchesMonthlyVehicle(j.jobName, mv));
    if (!matched) orphans.push(mv);
  });

  const jobsMissingMonthData = zoneJobs.filter(
    (j) => j.hasMd && j.monthRowCount === 0 && monthlyVehicles.some((mv) => jobMatchesMonthlyVehicle(j.jobName, mv))
  );

  const jobsNoMoreDetailsButMatchable = zoneJobs.filter(
    (j) => !j.hasMd && monthlyVehicles.some((mv) => jobMatchesMonthlyVehicle(j.jobName, mv))
  );

  console.log(`\n📋 Coverage check: ${monthlyPath} ↔ zones (prefix ${datePrefix})\n`);
  console.log(`Unique monthly vehicles: ${monthlyVehicles.length}`);
  console.log(`Real zone jobs scanned: ${zoneJobs.length}`);

  if (orphans.length === 0) {
    console.log('\n✅ Every monthly vehicle matches at least one zone job.');
  } else {
    console.log(`\n❌ Monthly vehicles with NO zone job match (${orphans.length}):`);
    orphans.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));
  }

  if (jobsMissingMonthData.length === 0) {
    console.log('\n✅ No matchable zone job is missing month rows in more_details.');
  } else {
    console.log(
      `\n⚠️  Matchable jobs with more_details but zero ${datePrefix} rows (${jobsMissingMonthData.length}):`
    );
    jobsMissingMonthData.slice(0, 50).forEach((j) => console.log(`  [${j.zoneName}] ${j.jobName}`));
    if (jobsMissingMonthData.length > 50) console.log(`  ... and ${jobsMissingMonthData.length - 50} more`);
  }

  if (jobsNoMoreDetailsButMatchable.length > 0) {
    console.log(
      `\n⚠️  Jobs that MATCH monthly data but have no more_details array (${jobsNoMoreDetailsButMatchable.length}) — run append after fixing append script to initialize more_details.`
    );
    jobsNoMoreDetailsButMatchable.slice(0, 30).forEach((j) => console.log(`  [${j.zoneName}] ${j.jobName}`));
    if (jobsNoMoreDetailsButMatchable.length > 30) console.log(`  ... and ${jobsNoMoreDetailsButMatchable.length - 30} more`);
  }

  process.exit(orphans.length > 0 ? 2 : 0);
}

main();
