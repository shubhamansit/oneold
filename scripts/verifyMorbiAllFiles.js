/**
 * Verify every MMC_June / MMC_July Excel file against Morbi JSON (Report Date mode).
 * Matches single-day export: all sheet rows including next-day spillover.
 *
 * Usage: node scripts/verifyMorbiAllFiles.js
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const data = require("../data/morbi/routeDetailSummary.json");
const DIRS = [
  { dir: path.join("public", "MMC_June", "MMC_June"), label: "June" },
  { dir: path.join("public", "MMC_July", "MMC_July"), label: "July" },
];

const KEYS = [
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

function dateFromFilename(name) {
  const m = String(name).match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function cellStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function parseFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: "",
  });
  const hi = rows.findIndex(
    (r) => r.includes("Town") && r.includes("Route Name") && r.includes("Vehicle")
  );
  if (hi < 0) throw new Error("no header");
  const header = rows[hi].map((h) => String(h || "").trim());
  const townIdx = header.indexOf("Town");
  const idx = {};
  for (const k of KEYS) {
    let i = -1;
    for (let c = townIdx; c < header.length; c++) {
      const cell = String(header[c] || "").trim();
      if (cell === k || (k === "Route Type" && cell === "Type")) {
        i = c;
        break;
      }
    }
    if (i < 0) throw new Error(`missing ${k}`);
    idx[k] = i;
  }
  const out = [];
  for (let r = hi + 1; r < rows.length; r++) {
    const cols = rows[r] || [];
    if (!cellStr(cols[townIdx])) continue;
    const obj = {};
    for (const k of KEYS) obj[k] = cellStr(cols[idx[k]]);
    out.push(obj);
  }

  // KPI from left summary (label in col A, value in B) when present
  let kpi = null;
  for (let r = 0; r < Math.min(hi, 20); r++) {
    const label = cellStr(rows[r][0]).toLowerCase();
    if (label.includes("planned")) {
      const planned = Number(rows[r][1]);
      const onTime = Number(rows[r + 1]?.[1]);
      const missed = Number(
        rows[r + 5]?.[1] ??
          rows.find((row) => cellStr(row[0]).toLowerCase().includes("missed"))?.[1]
      );
      if (Number.isFinite(planned)) {
        kpi = { planned, onTime, missed };
      }
      break;
    }
  }
  return { rows: out, kpi };
}

function fingerprint(r) {
  return KEYS.map((k) => cellStr(r[k])).join("|");
}

function sumKpi(rows) {
  let planned = 0;
  let onTime = 0;
  let missed = 0;
  for (const r of rows) {
    planned += Number(r["Planned POIs"]) || 0;
    onTime += Number(r["On-Time"]) || 0;
    missed += Number(r["Missed POIs"]) || 0;
  }
  return { planned, onTime, missed };
}

function checkFile(filePath, fileDate, label) {
  const { rows: excel, kpi: sheetKpi } = parseFile(filePath);
  const json = data
    .filter((r) => r["Report Date"] === fileDate)
    .sort((a, b) => (a.Seq ?? 0) - (b.Seq ?? 0));

  const issues = [];
  if (excel.length !== json.length) {
    issues.push(`count excel=${excel.length} json=${json.length}`);
  }

  const n = Math.min(excel.length, json.length);
  let fieldDiffs = 0;
  let orderDiffs = 0;
  for (let i = 0; i < n; i++) {
    if (fingerprint(excel[i]) !== fingerprint(json[i])) {
      // same content elsewhere?
      const fp = fingerprint(excel[i]);
      const jIdx = json.findIndex((r) => fingerprint(r) === fp);
      if (jIdx < 0) fieldDiffs++;
      else if (jIdx !== i) orderDiffs++;
      else fieldDiffs++;
    }
  }

  if (fieldDiffs) issues.push(`${fieldDiffs} field diffs`);
  if (orderDiffs) issues.push(`${orderDiffs} order diffs`);

  const eKpi = sumKpi(excel);
  const jKpi = sumKpi(json);
  if (
    eKpi.planned !== jKpi.planned ||
    eKpi.onTime !== jKpi.onTime ||
    eKpi.missed !== jKpi.missed
  ) {
    issues.push(
      `KPI sum excel ${eKpi.planned}/${eKpi.onTime}/${eKpi.missed} vs json ${jKpi.planned}/${jKpi.onTime}/${jKpi.missed}`
    );
  }

  let sheetKpiOk = true;
  if (sheetKpi && Number.isFinite(sheetKpi.planned)) {
    if (
      sheetKpi.planned !== eKpi.planned ||
      (Number.isFinite(sheetKpi.onTime) && sheetKpi.onTime !== eKpi.onTime)
    ) {
      sheetKpiOk = false;
      issues.push(
        `sheet header KPI ${sheetKpi.planned}/${sheetKpi.onTime} vs row-sum ${eKpi.planned}/${eKpi.onTime}`
      );
    }
  }

  const spillover = excel.filter((r) => r["Start Date"] !== fileDate).length;

  return {
    label,
    fileDate,
    file: path.basename(filePath),
    excel: excel.length,
    json: json.length,
    spillover,
    kpi: `${eKpi.planned}/${eKpi.onTime}/${eKpi.missed}`,
    sheetKpiOk,
    ok: issues.length === 0,
    issues,
  };
}

const results = [];
const seenDays = new Set();

for (const { dir, label } of DIRS) {
  if (!fs.existsSync(dir)) {
    console.log("Missing dir:", dir);
    continue;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"));

  // One file per calendar day (prefer first if duplicates)
  const byDay = new Map();
  for (const f of files) {
    const d = dateFromFilename(f);
    if (!d) continue;
    // Skip misplaced June file in July folder
    if (label === "July" && d.includes("-06-")) {
      results.push({
        label,
        fileDate: d,
        file: f,
        ok: false,
        skipped: true,
        issues: ["misplaced June file in July folder — ignored"],
      });
      continue;
    }
    if (!byDay.has(d)) byDay.set(d, path.join(dir, f));
  }

  for (const [day, full] of [...byDay.entries()].sort((a, b) => {
    const [da, ma, ya] = a[0].split("-").map(Number);
    const [db, mb, yb] = b[0].split("-").map(Number);
    return ya - yb || ma - mb || da - db;
  })) {
    seenDays.add(day);
    try {
      results.push(checkFile(full, day, label));
    } catch (e) {
      results.push({
        label,
        fileDate: day,
        file: path.basename(full),
        ok: false,
        issues: [String(e.message || e)],
      });
    }
  }
}

console.log(
  "Month | Date       | Excel | JSON | Spill | KPI P/OT/M        | Status"
);
console.log(
  "------|------------|-------|------|-------|-------------------|--------"
);

let okN = 0;
let checked = 0;
const bad = [];
for (const r of results) {
  if (r.skipped) {
    console.log(
      `${(r.label || "").padEnd(5)} | ${String(r.fileDate).padEnd(10)} | SKIP  | ${r.issues.join("; ")}`
    );
    continue;
  }
  checked++;
  const status = r.ok ? "OK" : `BAD: ${r.issues.join("; ")}`;
  console.log(
    `${(r.label || "").padEnd(5)} | ${String(r.fileDate).padEnd(10)} | ${String(r.excel ?? "-").padStart(5)} | ${String(r.json ?? "-").padStart(4)} | ${String(r.spillover ?? "-").padStart(5)} | ${String(r.kpi || "-").padEnd(17)} | ${status}`
  );
  if (r.ok) okN++;
  else bad.push(r);
}

// Calendar gaps
function gaps(month, daysInMonth) {
  const missing = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${String(d).padStart(2, "0")}-${month}-2026`;
    if (![...seenDays].includes(key)) missing.push(key);
  }
  return missing;
}

console.log("\n=== Coverage ===");
console.log("June files checked:", results.filter((r) => r.label === "June" && !r.skipped).length);
console.log("July files checked:", results.filter((r) => r.label === "July" && !r.skipped).length);
console.log("June calendar gaps:", gaps("06", 30).join(", ") || "none");
console.log("July calendar gaps:", gaps("07", 31).join(", ") || "none");
console.log(
  "JSON report rows June:",
  data.filter((r) => String(r["Report Date"] || "").endsWith("-06-2026")).length
);
console.log(
  "JSON report rows July:",
  data.filter((r) => String(r["Report Date"] || "").endsWith("-07-2026")).length
);

console.log("\n=== Result ===");
console.log(`OK: ${okN} / ${checked}`);
if (bad.length) {
  console.log("Failures:");
  for (const r of bad) {
    console.log(`  ${r.fileDate} (${r.file}): ${r.issues.join("; ")}`);
  }
  process.exitCode = 1;
} else {
  console.log("ALL June + July Excel files match Morbi JSON (report-day mode).");
}
