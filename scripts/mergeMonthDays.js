/**
 * Merge month days: keep earlier days from keep-file, take fromDay–toDay from new-file.
 * Usage:
 *   node scripts/mergeMonthDays.js monthlyData_2026_08.json keep.json new.json 30 31 2026-08
 */
const fs = require("fs");

const outPath = process.argv[2];
const keepPath = process.argv[3];
const newPath = process.argv[4];
const fromDay = Number(process.argv[5]);
const toDay = Number(process.argv[6]);
const prefix = process.argv[7]; // e.g. 2026-08

if (!outPath || !keepPath || !newPath || !fromDay || !toDay || !prefix) {
  console.error(
    "Usage: node scripts/mergeMonthDays.js <out.json> <keep.json> <new.json> <fromDay> <toDay> <YYYY-MM>"
  );
  process.exit(1);
}

function dayNum(r) {
  const d = String(r.Date || "").slice(0, 10);
  const m = d.match(new RegExp(`^${prefix}-(\\d{2})$`));
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

const keepData = JSON.parse(fs.readFileSync(keepPath, "utf8"));
const newData = JSON.parse(fs.readFileSync(newPath, "utf8"));

const keepOld = keepData.filter((r) => {
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

console.log("keep file:", keepData.length, counts(keepData));
console.log("new file:", newData.length, counts(newData));
console.log(
  `keepOld (<${fromDay}):`,
  keepOld.length,
  `keepNew (${fromDay}-${toDay}):`,
  keepNew.length,
  "merged:",
  merged.length
);
console.log("merged:", counts(merged));

if (!keepOld.length || !keepNew.length) {
  console.error("Merge produced empty side — aborting");
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
console.log("Saved", outPath);
