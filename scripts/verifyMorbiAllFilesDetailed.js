/**
 * One-by-one verify: each MMC June/July Excel vs Morbi JSON (Report Date mode).
 * Checks: row count, order, every field, KPI row-sums, sheet header KPI.
 *
 * Usage: node scripts/verifyMorbiAllFilesDetailed.js
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

function numEq(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  return cellStr(a) === cellStr(b);
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
    if (i < 0) throw new Error(`missing column ${k}`);
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

  // Sheet left KPI block (labels often in col A or near header)
  const kpi = {};
  for (let r = 0; r < Math.min(rows.length, hi + 8); r++) {
    for (let c = 0; c < 3; c++) {
      const label = cellStr(rows[r][c]).toLowerCase();
      const val = Number(rows[r][c + 1]);
      if (!Number.isFinite(val)) continue;
      if (label.includes("planned")) kpi.planned = val;
      else if (label === "on-time" || label.startsWith("on-time")) kpi.onTime = val;
      else if (label === "early") kpi.early = val;
      else if (label === "delay") kpi.delay = val;
      else if (label.includes("total vis")) kpi.visited = val;
      else if (label.includes("missed")) kpi.missed = val;
    }
  }
  return { rows: out, kpi, headerRow: hi };
}

function sumKpi(rows) {
  return {
    planned: rows.reduce((s, r) => s + (Number(r["Planned POIs"]) || 0), 0),
    onTime: rows.reduce((s, r) => s + (Number(r["On-Time"]) || 0), 0),
    early: rows.reduce((s, r) => s + (Number(r.Early) || 0), 0),
    delay: rows.reduce((s, r) => s + (Number(r.Delay) || 0), 0),
    visited: rows.reduce((s, r) => s + (Number(r["Total Visited POIs"]) || 0), 0),
    missed: rows.reduce((s, r) => s + (Number(r["Missed POIs"]) || 0), 0),
  };
}

function checkOne(filePath, fileDate, label) {
  const { rows: excel, kpi: sheetKpi } = parseFile(filePath);
  const json = data
    .filter((r) => r["Report Date"] === fileDate)
    .sort((a, b) => (Number(a.Seq) || 0) - (Number(b.Seq) || 0));

  const issues = [];
  if (excel.length !== json.length) {
    issues.push(`count excel=${excel.length} json=${json.length}`);
  }

  const n = Math.max(excel.length, json.length);
  const fieldSamples = [];
  let fieldDiffs = 0;
  for (let i = 0; i < n; i++) {
    const er = excel[i];
    const jr = json[i];
    if (!er) {
      fieldDiffs++;
      if (fieldSamples.length < 3)
        fieldSamples.push(`row ${i + 1}: missing in excel (${jr?.["Route Name"]})`);
      continue;
    }
    if (!jr) {
      fieldDiffs++;
      if (fieldSamples.length < 3)
        fieldSamples.push(`row ${i + 1}: missing in json (${er["Route Name"]})`);
      continue;
    }
    for (const k of KEYS) {
      const ok =
        k.includes("POI") ||
        k === "On-Time" ||
        k === "Early" ||
        k === "Delay"
          ? numEq(er[k], jr[k])
          : cellStr(er[k]) === cellStr(jr[k]);
      if (!ok) {
        fieldDiffs++;
        if (fieldSamples.length < 5) {
          fieldSamples.push(
            `row ${i + 1} ${er["Route Name"]} ${k}: excel="${er[k]}" json="${jr[k]}"`
          );
        }
      }
    }
  }
  if (fieldDiffs) {
    issues.push(`${fieldDiffs} field mismatches`);
    issues.push(...fieldSamples);
  }

  const eKpi = sumKpi(excel);
  const jKpi = sumKpi(json);
  if (
    eKpi.planned !== jKpi.planned ||
    eKpi.onTime !== jKpi.onTime ||
    eKpi.missed !== jKpi.missed
  ) {
    issues.push(
      `row-sum KPI excel ${eKpi.planned}/${eKpi.onTime}/${eKpi.missed} != json ${jKpi.planned}/${jKpi.onTime}/${jKpi.missed}`
    );
  }

  // Header KPI vs excel row sum (source file integrity)
  if (sheetKpi.planned != null && sheetKpi.planned !== eKpi.planned) {
    issues.push(
      `sheet header Planned ${sheetKpi.planned} != excel row-sum ${eKpi.planned}`
    );
  }
  if (sheetKpi.onTime != null && sheetKpi.onTime !== eKpi.onTime) {
    issues.push(
      `sheet header On-Time ${sheetKpi.onTime} != excel row-sum ${eKpi.onTime}`
    );
  }
  if (sheetKpi.missed != null && sheetKpi.missed !== eKpi.missed) {
    issues.push(
      `sheet header Missed ${sheetKpi.missed} != excel row-sum ${eKpi.missed}`
    );
  }

  const spillover = excel.filter((r) => r["Start Date"] !== fileDate).length;
  const headerLabel =
    sheetKpi.planned != null
      ? `${sheetKpi.planned}/${sheetKpi.onTime ?? "?"}/${sheetKpi.missed ?? "?"}`
      : "(no header KPI)";

  return {
    label,
    fileDate,
    file: path.basename(filePath),
    excel: excel.length,
    json: json.length,
    spillover,
    headerKpi: headerLabel,
    rowKpi: `${eKpi.planned}/${eKpi.onTime}/${eKpi.missed}`,
    ok: issues.length === 0,
    issues,
  };
}

const results = [];
const seen = new Set();

for (const { dir, label } of DIRS) {
  if (!fs.existsSync(dir)) {
    console.log("MISSING FOLDER:", dir);
    continue;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
    .map((f) => ({ f, d: dateFromFilename(f), full: path.join(dir, f) }))
    .filter((x) => x.d)
    .sort((a, b) => {
      const [da, ma, ya] = a.d.split("-").map(Number);
      const [db, mb, yb] = b.d.split("-").map(Number);
      return ya - yb || ma - mb || da - db || a.f.localeCompare(b.f);
    });

  console.log(`\n========== ${label.toUpperCase()} (${files.length} files) ==========\n`);

  for (const { f, d, full } of files) {
    if (label === "July" && d.includes("-06-")) {
      console.log(`SKIP  ${d}  ${f}`);
      console.log(`       misplaced June file in July folder\n`);
      results.push({ label, fileDate: d, file: f, ok: true, skipped: true });
      continue;
    }
    if (seen.has(`${label}|${d}`)) {
      console.log(`SKIP  ${d}  duplicate file ${f}\n`);
      continue;
    }
    seen.add(`${label}|${d}`);

    let r;
    try {
      r = checkOne(full, d, label);
    } catch (e) {
      r = {
        label,
        fileDate: d,
        file: f,
        ok: false,
        issues: [String(e.message || e)],
      };
    }
    results.push(r);

    const mark = r.ok ? "OK" : "FAIL";
    console.log(
      `${mark.padEnd(4)} ${d}  rows ${String(r.excel).padStart(2)}/${String(r.json).padStart(2)}  spill ${r.spillover ?? 0}  headerKPI ${r.headerKpi}  rowKPI ${r.rowKpi}`
    );
    console.log(`     ${f}`);
    if (!r.ok) {
      for (const issue of r.issues) console.log(`     ! ${issue}`);
    }
    console.log("");
  }
}

const checked = results.filter((r) => !r.skipped);
const okN = checked.filter((r) => r.ok).length;
const bad = checked.filter((r) => !r.ok);

function gaps(month, daysInMonth) {
  const missing = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${String(d).padStart(2, "0")}-${month}-2026`;
    const hit = checked.some((r) => r.fileDate === key);
    if (!hit) missing.push(key);
  }
  return missing;
}

console.log("========== SUMMARY ==========");
console.log(`Checked: ${okN}/${checked.length} OK`);
console.log("June calendar gaps:", gaps("06", 30).join(", ") || "none");
console.log("July calendar gaps:", gaps("07", 31).join(", ") || "none");
if (bad.length) {
  console.log("\nFAILED DAYS:");
  for (const r of bad) {
    console.log(`- ${r.fileDate}: ${r.issues.join(" | ")}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nALL FILES MATCH JSON (row-by-row + KPI).");
}
