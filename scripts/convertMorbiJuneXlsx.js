/**
 * Convert all MMC June Route Detail Summary Excel files into
 * data/morbi/routeDetailSummary.json for the Morbi user.
 *
 * Usage: node scripts/convertMorbiJuneXlsx.js
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const INPUT_DIR = path.join("public", "MMC_June");
const OUT_FILE = path.join("data", "morbi", "routeDetailSummary.json");

const DATA_KEYS = [
  "Town",
  "Zone",
  "Ward",
  "Route Name",
  "Route Type",
  "Status",
  "Start Date",
  "Vehicle",
  "Start Time",
  "End Time",
  "Actual Start Time",
  "Actual End Time",
  "Planned POIs",
  "On-Time",
  "Early",
  "Delay",
  "Total Visited POIs",
  "Missed POIs",
];

const NUMERIC_KEYS = [
  "Planned POIs",
  "On-Time",
  "Early",
  "Delay",
  "Total Visited POIs",
  "Missed POIs",
];

function parseDateKey(dateStr) {
  const m = String(dateStr || "")
    .trim()
    .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateFromFilename(name) {
  const m = name.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.includes("Town") && row.includes("Route Name") && row.includes("Vehicle")) {
      return i;
    }
  }
  return -1;
}

function parseWorkbook(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) {
    throw new Error(`Header not found in ${path.basename(filePath)}`);
  }

  const header = rows[headerIdx].map((h) => String(h || "").trim());
  // Excel has summary KPIs in early columns; real fields start at Town.
  const townIdx = header.indexOf("Town");
  if (townIdx < 0) {
    throw new Error(`Town column not found in ${path.basename(filePath)}`);
  }

  const keyIndexes = {};
  for (const key of DATA_KEYS) {
    // Prefer the first match at/after Town (Planned POIs appears twice).
    let idx = -1;
    for (let i = townIdx; i < header.length; i++) {
      if (header[i] === key) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      throw new Error(`Missing column "${key}" in ${path.basename(filePath)}`);
    }
    keyIndexes[key] = idx;
  }

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i] || [];
    const town = String(cols[keyIndexes.Town] ?? "").trim();
    const routeName = String(cols[keyIndexes["Route Name"]] ?? "").trim();
    const vehicle = String(cols[keyIndexes.Vehicle] ?? "").trim();
    if (!town || (!routeName && !vehicle)) continue;

    const obj = {};
    for (const key of DATA_KEYS) {
      const raw = cols[keyIndexes[key]];
      const value = raw === undefined || raw === null ? "" : String(raw).trim();
      obj[key] = value;
    }
    for (const nk of NUMERIC_KEYS) {
      const n = Number(obj[nk]);
      obj[nk] = Number.isFinite(n) ? n : 0;
    }
    out.push(obj);
  }
  return out;
}

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error("Missing input folder:", INPUT_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
    .map((f) => ({
      name: f,
      full: path.join(INPUT_DIR, f),
      dateKey: dateFromFilename(f),
    }))
    .filter((f) => f.dateKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.name.localeCompare(b.name));

  if (!files.length) {
    console.error("No .xlsx files found in", INPUT_DIR);
    process.exit(1);
  }

  // One file per calendar day (keep first after sort if duplicates).
  const byDay = new Map();
  for (const file of files) {
    if (!byDay.has(file.dateKey)) byDay.set(file.dateKey, file);
  }
  const uniqueFiles = [...byDay.values()];

  const allRows = [];
  const dayStats = [];

  for (const file of uniqueFiles) {
    const rows = parseWorkbook(file.full);
    // Prefer Start Date inside the sheet; fall back to filename date.
    for (const row of rows) {
      if (!parseDateKey(row["Start Date"])) {
        const [y, m, d] = file.dateKey.split("-");
        row["Start Date"] = `${d}-${m}-${y}`;
      }
    }
    allRows.push(...rows);
    dayStats.push({
      date: file.dateKey,
      file: file.name,
      rows: rows.length,
    });
    console.log(
      `${file.dateKey}  ${String(rows.length).padStart(3)} rows  ${file.name}`
    );
  }

  allRows.sort((a, b) => {
    const da = parseDateKey(a["Start Date"]) || "";
    const db = parseDateKey(b["Start Date"]) || "";
    if (da !== db) return da.localeCompare(db);
    return String(a["Route Name"] || "").localeCompare(
      String(b["Route Name"] || ""),
      undefined,
      { numeric: true }
    );
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(allRows, null, 2));

  const dates = [...new Set(allRows.map((r) => r["Start Date"]))];
  console.log("\nSaved", OUT_FILE);
  console.log("Days:", dayStats.length, "→", dates[0], "…", dates[dates.length - 1]);
  console.log("Total rows:", allRows.length);
  console.log(
    "Statuses:",
    [...new Set(allRows.map((r) => r.Status))].join(", ")
  );
}

main();
