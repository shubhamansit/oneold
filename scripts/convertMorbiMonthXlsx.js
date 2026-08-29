/**
 * Convert MMC Route Detail Summary Excel files for a month and merge into
 * data/morbi/routeDetailSummary.json (keeps other months intact).
 *
 * Usage:
 *   node scripts/convertMorbiMonthXlsx.js public/MMC_July 2026-07
 *   node scripts/convertMorbiMonthXlsx.js public/MMC_June 2026-06
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

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

/** Some exports truncate headers (e.g. "  Type" instead of "Route Type"). */
const HEADER_ALIASES = {
  "Route Type": ["Route Type", "Type", "  Type"],
};

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

function monthKeyFromDateKey(dateKey) {
  return dateKey ? dateKey.slice(0, 7) : null;
}

function dateFromFilename(name) {
  const m = name.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

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

function parseWorkbook(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) {
    throw new Error(`Header not found in ${path.basename(filePath)}`);
  }

  const header = rows[headerIdx].map((h) => String(h || "").trim());
  const townIdx = header.indexOf("Town");
  if (townIdx < 0) {
    throw new Error(`Town column not found in ${path.basename(filePath)}`);
  }

  const keyIndexes = {};
  for (const key of DATA_KEYS) {
    const aliases = HEADER_ALIASES[key] || [key];
    let idx = -1;
    for (let i = townIdx; i < header.length; i++) {
      const cell = String(header[i] || "").trim();
      if (aliases.some((a) => a.trim() === cell || a === header[i])) {
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

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const ra = parseDateKey(a["Report Date"]) || parseDateKey(a["Start Date"]) || "";
    const rb = parseDateKey(b["Report Date"]) || parseDateKey(b["Start Date"]) || "";
    if (ra !== rb) return ra.localeCompare(rb);
    const sa = Number(a.Seq);
    const sb = Number(b.Seq);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
    const da = parseDateKey(a["Start Date"]) || "";
    const db = parseDateKey(b["Start Date"]) || "";
    return da.localeCompare(db);
  });
}

function rowReportMonth(row) {
  return (
    monthKeyFromDateKey(parseDateKey(row["Report Date"])) ||
    monthKeyFromDateKey(parseDateKey(row["Start Date"]))
  );
}

function main() {
  const inputDir = process.argv[2] || path.join("public", "MMC_July");
  const targetMonth = process.argv[3] || "2026-07"; // YYYY-MM

  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    console.error("Month must be YYYY-MM, got:", targetMonth);
    process.exit(1);
  }
  if (!fs.existsSync(inputDir)) {
    console.error("Missing input folder:", inputDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
    .map((f) => ({
      name: f,
      full: path.join(inputDir, f),
      dateKey: dateFromFilename(f),
    }))
    .filter((f) => f.dateKey && monthKeyFromDateKey(f.dateKey) === targetMonth)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.name.localeCompare(b.name));

  if (!files.length) {
    console.error(
      `No .xlsx files for ${targetMonth} found in ${inputDir}`
    );
    process.exit(1);
  }

  const byDay = new Map();
  for (const file of files) {
    if (!byDay.has(file.dateKey)) byDay.set(file.dateKey, file);
  }
  const uniqueFiles = [...byDay.values()];

  const monthRows = [];
  let seq = 0;
  for (const file of uniqueFiles) {
    const rows = parseWorkbook(file.full);
    const [y, m, d] = file.dateKey.split("-");
    const reportDate = `${d}-${m}-${y}`; // DD-MM-YYYY = daily report file date

    let sameDay = 0;
    let spillover = 0;
    for (const row of rows) {
      if (!parseDateKey(row["Start Date"])) {
        row["Start Date"] = reportDate;
      }
      row["Report Date"] = reportDate;
      row.Seq = seq++;
      if (row["Start Date"] === reportDate) sameDay++;
      else spillover++;
      monthRows.push(row);
    }
    console.log(
      `${file.dateKey}  ${String(rows.length).padStart(3)} rows  (${sameDay} same-day, ${spillover} spillover)  ${file.name}`
    );
  }

  let existing = [];
  if (fs.existsSync(OUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
    if (!Array.isArray(existing)) existing = [];
  }

  const keptOtherMonths = existing.filter(
    (r) => rowReportMonth(r) !== targetMonth
  );
  const merged = sortRows([...keptOtherMonths, ...monthRows]);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2));

  const reportDays = [
    ...new Set(monthRows.map((r) => r["Report Date"]).filter(Boolean)),
  ].sort((a, b) => {
    const pa = parseDateKey(a) || "";
    const pb = parseDateKey(b) || "";
    return pa.localeCompare(pb);
  });
  const months = [
    ...new Set(merged.map((r) => rowReportMonth(r)).filter(Boolean).sort()),
  ];

  console.log("\nSaved", OUT_FILE);
  console.log(
    `Month ${targetMonth}: ${uniqueFiles.length} report days, ${monthRows.length} rows (includes spillover)`
  );
  if (reportDays.length) {
    console.log(`Report span: ${reportDays[0]} … ${reportDays[reportDays.length - 1]}`);
  }
  console.log("All months in JSON:", months.join(", "));
  console.log("Total rows:", merged.length);

  const [y, m] = targetMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const present = new Set(
    reportDays.map((d) => Number(String(d).slice(0, 2)))
  );
  const missing = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (!present.has(d)) missing.push(String(d).padStart(2, "0"));
  }
  if (missing.length) {
    console.log(
      `Missing ${targetMonth} report files:`,
      missing.join(", ")
    );
  }
}

main();
