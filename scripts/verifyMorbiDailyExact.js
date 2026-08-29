/**
 * Per-day verify: each Excel file's own-date rows must match Morbi JSON exactly.
 * Usage: node scripts/verifyMorbiDailyExact.js
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const data = require("../data/morbi/routeDetailSummary.json");
const DIRS = [
  path.join("public", "MMC_June", "MMC_June"),
  path.join("public", "MMC_July", "MMC_July"),
];

function dateFromFilename(name) {
  const m = String(name).match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
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
  const keys = [
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
  const idx = {};
  for (const k of keys) {
    let i = -1;
    for (let c = townIdx; c < header.length; c++) {
      const cell = String(header[c] || "").trim();
      if (cell === k || (k === "Route Type" && cell === "Type")) {
        i = c;
        break;
      }
    }
    if (i < 0) throw new Error(`missing ${k} in ${path.basename(filePath)}`);
    idx[k] = i;
  }
  const out = [];
  for (let r = hi + 1; r < rows.length; r++) {
    const cols = rows[r] || [];
    if (!String(cols[townIdx] ?? "").trim()) continue;
    const obj = {};
    for (const k of keys) {
      const raw = cols[idx[k]];
      obj[k] = raw === undefined || raw === null ? "" : String(raw).trim();
    }
    out.push(obj);
  }
  return out;
}

function fingerprint(r) {
  return [
    r["Route Name"],
    r.Vehicle,
    r.Status,
    r["Start Time"],
    r["End Time"],
    r["Actual Start Time"],
    r["Actual End Time"],
    r["Planned POIs"],
    r["On-Time"],
    r.Early,
    r.Delay,
    r["Total Visited POIs"],
    r["Missed POIs"],
  ].join("|");
}

function checkDay(filePath, fileDate) {
  const excel = parseFile(filePath).filter((r) => r["Start Date"] === fileDate);
  const json = data.filter((r) => r["Start Date"] === fileDate);
  const emap = new Map(excel.map((r) => [`${r["Route Name"]}||${r.Vehicle}`, r]));
  const jmap = new Map(json.map((r) => [`${r["Route Name"]}||${r.Vehicle}`, r]));

  let missing = 0;
  let extra = 0;
  let diffs = 0;
  for (const [k, er] of emap) {
    const jr = jmap.get(k);
    if (!jr) {
      missing++;
      continue;
    }
    if (fingerprint(er) !== fingerprint(jr)) diffs++;
  }
  for (const k of jmap.keys()) {
    if (!emap.has(k)) extra++;
  }
  const dups = json.length - jmap.size;
  return {
    fileDate,
    file: path.basename(filePath),
    excel: excel.length,
    json: json.length,
    missing,
    extra,
    diffs,
    dups,
    ok:
      missing === 0 &&
      extra === 0 &&
      diffs === 0 &&
      dups === 0 &&
      excel.length === json.length,
  };
}

const results = [];
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"));
  const byDay = new Map();
  for (const f of files) {
    const d = dateFromFilename(f);
    if (!d) continue;
    if (!byDay.has(d)) byDay.set(d, path.join(dir, f));
  }
  for (const [day, full] of [...byDay.entries()].sort()) {
    // Skip misplaced June file inside July folder
    if (dir.includes("MMC_July") && day.includes("-06-")) continue;
    try {
      results.push(checkDay(full, day));
    } catch (e) {
      results.push({
        fileDate: day,
        file: path.basename(full),
        ok: false,
        error: String(e.message || e),
      });
    }
  }
}

console.log("Date       | Excel | JSON | Status");
console.log("-----------|-------|------|--------");
let okN = 0;
const bad = [];
for (const r of results) {
  const status = r.ok
    ? "OK"
    : r.error
      ? `ERROR ${r.error}`
      : `BAD m${r.missing}/e${r.extra}/d${r.diffs}/dup${r.dups}`;
  console.log(
    `${String(r.fileDate).padEnd(10)} | ${String(r.excel ?? "-").padStart(5)} | ${String(r.json ?? "-").padStart(4)} | ${status}`
  );
  if (r.ok) okN++;
  else bad.push(r);
}

console.log("\nOK:", okN, "/", results.length);
console.log(
  "JSON June:",
  data.filter((r) => r["Start Date"].endsWith("-06-2026")).length,
  "July:",
  data.filter((r) => r["Start Date"].endsWith("-07-2026")).length,
  "Total:",
  data.length
);
console.log(
  "July 11 present:",
  data.some((r) => r["Start Date"] === "11-07-2026") ? "yes" : "NO (no Excel file)"
);
if (bad.length) console.log("Failures:", bad);
else console.log("ALL DAILY FILES MATCH JSON EXACTLY");
