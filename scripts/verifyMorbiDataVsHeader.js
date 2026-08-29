/**
 * Split check: Excel row data vs JSON, and Excel header KPI vs row sum.
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const data = require("../data/morbi/routeDetailSummary.json");
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
  return v == null ? "" : String(v).trim();
}
function fp(r) {
  return KEYS.map((k) => cellStr(r[k])).join("|");
}
function sum(rows, k) {
  return rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
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
  const header = rows[hi].map((h) => String(h || "").trim());
  const townIdx = header.indexOf("Town");
  const idx = {};
  for (const k of KEYS) {
    for (let c = townIdx; c < header.length; c++) {
      const cell = String(header[c] || "").trim();
      if (cell === k || (k === "Route Type" && cell === "Type")) {
        idx[k] = c;
        break;
      }
    }
  }
  const out = [];
  for (let r = hi + 1; r < rows.length; r++) {
    const cols = rows[r] || [];
    if (!cellStr(cols[townIdx])) continue;
    const o = {};
    for (const k of KEYS) o[k] = cellStr(cols[idx[k]]);
    out.push(o);
  }
  return {
    rows: out,
    kpi: {
      planned: Number(rows[4][1]),
      onTime: Number(rows[5][1]),
      missed: Number(rows[9][1]),
    },
  };
}

const dirs = [
  { dir: path.join("public", "MMC_June", "MMC_June"), label: "June" },
  { dir: path.join("public", "MMC_July", "MMC_July"), label: "July" },
];

let dataOk = 0;
let dataFail = 0;
const headerMismatch = [];

for (const { dir, label } of dirs) {
  console.log(`\n=== ${label} ===`);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".xlsx") && !f.startsWith("~$"));
  const byDay = new Map();
  for (const f of files) {
    const d = dateFromFilename(f);
    if (!d) continue;
    if (label === "July" && d.includes("-06-")) continue;
    if (!byDay.has(d)) byDay.set(d, path.join(dir, f));
  }
  for (const [day, full] of [...byDay.entries()].sort((a, b) => {
    const [da, ma, ya] = a[0].split("-").map(Number);
    const [db, mb, yb] = b[0].split("-").map(Number);
    return ya - yb || ma - mb || da - db;
  })) {
    const { rows: excel, kpi } = parseFile(full);
    const json = data
      .filter((r) => r["Report Date"] === day)
      .sort((a, b) => (a.Seq || 0) - (b.Seq || 0));
    let ok = excel.length === json.length;
    for (let i = 0; i < excel.length && ok; i++) {
      if (fp(excel[i]) !== fp(json[i])) ok = false;
    }
    const eP = sum(excel, "Planned POIs");
    const eO = sum(excel, "On-Time");
    const eM = sum(excel, "Missed POIs");
    const hdrBad =
      kpi.planned !== eP || kpi.onTime !== eO || kpi.missed !== eM;
    if (ok) dataOk++;
    else dataFail++;
    const mark = ok ? "DATA-OK" : "DATA-BAD";
    const hdr = hdrBad
      ? `SOURCE-HEADER-STALE ${kpi.planned}/${kpi.onTime}/${kpi.missed} vs rows ${eP}/${eO}/${eM}`
      : `KPI ${kpi.planned}/${kpi.onTime}/${kpi.missed}`;
    console.log(`${mark.padEnd(8)} ${day}  n=${excel.length}  ${hdr}`);
    if (hdrBad) headerMismatch.push(`${day} header=${kpi.planned}/${kpi.onTime}/${kpi.missed} rows=${eP}/${eO}/${eM}`);
  }
}

console.log("\n=== RESULT ===");
console.log(`Excel rows == JSON: ${dataOk}/${dataOk + dataFail}`);
console.log(`Source files with stale left KPI (header != row sum): ${headerMismatch.length}`);
headerMismatch.forEach((x) => console.log(" ", x));
