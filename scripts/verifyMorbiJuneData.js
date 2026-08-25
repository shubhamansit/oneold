const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const INPUT_DIR = path.join("public", "MMC_June");
const data = require("../data/morbi/routeDetailSummary.json");

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (
      row.includes("Town") &&
      row.includes("Route Name") &&
      row.includes("Vehicle")
    ) {
      return i;
    }
  }
  return -1;
}

function countExcelRows(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) return { count: 0 };
  const header = rows[headerIdx].map((h) => String(h || "").trim());
  const townIdx = header.indexOf("Town");
  const routeIdx = header.indexOf("Route Name", townIdx);
  const vehicleIdx = header.indexOf("Vehicle", townIdx);
  let count = 0;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i] || [];
    const town = String(cols[townIdx] ?? "").trim();
    const route = String(cols[routeIdx] ?? "").trim();
    const vehicle = String(cols[vehicleIdx] ?? "").trim();
    if (!town || (!route && !vehicle)) continue;
    count++;
  }
  return { count };
}

function dateFromFilename(name) {
  const m = String(name).match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const files = fs
  .readdirSync(INPUT_DIR)
  .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"));

const byDay = new Map();
for (const f of files) {
  const d = dateFromFilename(f);
  if (!d) continue;
  if (!byDay.has(d)) byDay.set(d, f);
}

const jsonByDay = {};
for (const r of data) {
  const d = r["Start Date"];
  jsonByDay[d] = (jsonByDay[d] || 0) + 1;
}

let excelTotal = 0;
const mismatches = [];
const missingDays = [];

console.log("Date       | Excel | JSON | Status");
console.log("-----------|-------|------|--------");

const days = [...byDay.keys()].sort((a, b) => {
  const [ad, am, ay] = a.split("-").map(Number);
  const [bd, bm, by] = b.split("-").map(Number);
  return ay - by || am - bm || ad - bd;
});

for (const day of days) {
  const file = byDay.get(day);
  const excel = countExcelRows(path.join(INPUT_DIR, file));
  const jCount = jsonByDay[day] || 0;
  excelTotal += excel.count;
  const ok = excel.count === jCount;
  if (!ok) mismatches.push({ day, excel: excel.count, json: jCount, file });
  if (!(day in jsonByDay)) missingDays.push(day);
  console.log(
    `${day.padEnd(10)} | ${String(excel.count).padStart(5)} | ${String(jCount).padStart(4)} | ${ok ? "OK" : "MISMATCH"}`
  );
}

const extraDays = Object.keys(jsonByDay).filter((d) => !byDay.has(d));
const expectedJune = [];
for (let d = 1; d <= 30; d++) {
  expectedJune.push(`${String(d).padStart(2, "0")}-06-2026`);
}
const missingJuneDays = expectedJune.filter((d) => !jsonByDay[d]);

console.log("");
console.log("Excel files in folder:", files.length);
console.log("Unique days in folder:", byDay.size);
console.log("Unique days in JSON:", Object.keys(jsonByDay).length);
console.log("Excel total rows:", excelTotal);
console.log("JSON total rows:", data.length);
console.log("Mismatches:", mismatches.length ? mismatches : "none");
console.log("Missing days vs files:", missingDays.length ? missingDays : "none");
console.log("Extra days in JSON:", extraDays.length ? extraDays : "none");
console.log(
  "Missing June calendar days:",
  missingJuneDays.length ? missingJuneDays : "none"
);
console.log(
  "ALL DATA ADDED:",
  excelTotal === data.length &&
    mismatches.length === 0 &&
    missingDays.length === 0 &&
    missingJuneDays.length === 0 &&
    byDay.size === 30
);
