/**
 * Merge August monthly: keep days 1-24 from git HEAD, days 25-29 from newly generated file.
 * Usage:
 *   1. node excelToMonthlyData.js "BMC Data - 29 Aug.xls" 2026 8
 *   2. node scripts/mergeAugustDays.js 25 29
 *      (reads new monthly from disk + old from git HEAD)
 */
const fs = require("fs");
const { execSync } = require("child_process");

const MONTHLY = "monthlyData_2026_08.json";
const fromDay = Number(process.argv[2] || 25);
const toDay = Number(process.argv[3] || 29);

function dayNum(r) {
  const d = String(r.Date || "").slice(0, 10);
  const m = d.match(/^2026-08-(\d{2})$/);
  return m ? Number(m[1]) : null;
}

function counts(rows) {
  const byDay = {};
  for (const r of rows) {
    const k = String(r.Date || "").slice(0, 10);
    byDay[k] = (byDay[k] || 0) + 1;
  }
  return Object.keys(byDay)
    .sort()
    .map((k) => `${k.slice(8)}:${byDay[k]}`)
    .join(" ");
}

// Prefer a sibling backup if present; else regenerate is caller's job.
// Here: new data should already be on disk BEFORE this script — but we wiped it.
// So restore new from excel again is needed if disk is empty.
// This script expects:
//   - git HEAD has previous monthly (1-24)
//   - ./monthlyData_2026_08.new.json has the freshly generated full month
// OR pass --from-excel path

const newPath = fs.existsSync("monthlyData_2026_08.new.json")
  ? "monthlyData_2026_08.new.json"
  : null;

if (!newPath) {
  console.error(
    "Missing monthlyData_2026_08.new.json — regenerate first:\n" +
      '  node excelToMonthlyData.js "BMC Data - 29 Aug.xls" 2026 8\n' +
      "  copy monthlyData_2026_08.json monthlyData_2026_08.new.json\n" +
      "  git checkout HEAD -- monthlyData_2026_08.json\n" +
      "  node scripts/mergeAugustDays.js 25 29"
  );
  process.exit(1);
}

const newData = JSON.parse(fs.readFileSync(newPath, "utf8"));
const oldRaw = execSync("git show HEAD:monthlyData_2026_08.json", {
  maxBuffer: 200 * 1024 * 1024,
}).toString();
const oldData = JSON.parse(oldRaw);

const keepOld = oldData.filter((r) => {
  const d = dayNum(r);
  return d != null && d < fromDay;
});
const keepNew = newData.filter((r) => {
  const d = dayNum(r);
  return d != null && d >= fromDay && d <= toDay;
});

const merged = [...keepOld, ...keepNew].sort(
  (a, b) =>
    String(a.Date).localeCompare(String(b.Date)) ||
    String(a.Vehicle).localeCompare(String(b.Vehicle))
);

console.log("old:", oldData.length, "counts:", counts(oldData));
console.log("new:", newData.length, "counts:", counts(newData));
console.log(
  `keepOld (<${fromDay}):`,
  keepOld.length,
  `keepNew (${fromDay}-${toDay}):`,
  keepNew.length,
  "merged:",
  merged.length
);
console.log("merged counts:", counts(merged));

if (!keepOld.length || !keepNew.length) {
  console.error("Merge produced empty side — aborting save");
  process.exit(1);
}

fs.writeFileSync(MONTHLY, JSON.stringify(merged, null, 2));
console.log("Saved", MONTHLY);
