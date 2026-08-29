/**
 * Import a single Morbi Route Detail Summary Excel day into JSON.
 * Usage: node scripts/importMorbiDayXlsx.js path/to/file.xlsx
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
  return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

function dateFromFilename(name) {
  const m = String(name).match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`; // DD-MM-YYYY
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
  if (headerIdx < 0) throw new Error("Header not found");

  const header = rows[headerIdx].map((h) => String(h || "").trim());
  const townIdx = header.indexOf("Town");
  if (townIdx < 0) throw new Error("Town column not found");

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
    if (idx < 0) throw new Error(`Missing column "${key}"`);
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
      obj[key] = raw === undefined || raw === null ? "" : String(raw).trim();
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
    return (parseDateKey(a["Start Date"]) || "").localeCompare(
      parseDateKey(b["Start Date"]) || ""
    );
  });
}

function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Usage: node scripts/importMorbiDayXlsx.js <file.xlsx>");
    process.exit(1);
  }

  const reportDate = dateFromFilename(path.basename(filePath));
  if (!reportDate) {
    console.error("Could not parse DD-MM-YYYY from filename");
    process.exit(1);
  }

  const parsed = parseWorkbook(filePath);
  let sameDay = 0;
  let spillover = 0;
  const dayRows = parsed.map((row, i) => {
    if (!parseDateKey(row["Start Date"])) row["Start Date"] = reportDate;
    row["Report Date"] = reportDate;
    row.Seq = i;
    if (row["Start Date"] === reportDate) sameDay++;
    else spillover++;
    return row;
  });

  let existing = [];
  if (fs.existsSync(OUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf8"));
    if (!Array.isArray(existing)) existing = [];
  }

  const kept = existing.filter((r) => r["Report Date"] !== reportDate);
  // Reassign Seq uniquely across file — keep relative order within other days
  // by only replacing this day's block; Seq may collide across days which is OK
  // (sort uses Report Date first).
  const merged = sortRows([...kept, ...dayRows]);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2));

  const planned = dayRows.reduce((s, r) => s + (Number(r["Planned POIs"]) || 0), 0);
  const onTime = dayRows.reduce((s, r) => s + (Number(r["On-Time"]) || 0), 0);
  const missed = dayRows.reduce((s, r) => s + (Number(r["Missed POIs"]) || 0), 0);

  console.log(`Imported ${reportDate}: ${dayRows.length} rows (${sameDay} same-day, ${spillover} spillover)`);
  console.log(`KPI row-sum: Planned ${planned} / On-Time ${onTime} / Missed ${missed}`);
  console.log(`JSON total rows: ${merged.length} (was ${existing.length})`);
  console.log("Saved", OUT_FILE);
}

main();
