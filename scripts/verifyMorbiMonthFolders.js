/**
 * Verify Morbi JSON against MMC_June + MMC_July Excel sources.
 * Usage: node scripts/verifyMorbiMonthFolders.js
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const OUT_JSON = path.join("data", "morbi", "routeDetailSummary.json");
const FOLDERS = [
  path.join("public", "MMC_June", "MMC_June"),
  path.join("public", "MMC_June"),
  path.join("public", "MMC_July", "MMC_July"),
  path.join("public", "MMC_July"),
];

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

function findCol(header, key, fromIdx) {
  const aliases = HEADER_ALIASES[key] || [key];
  for (let i = fromIdx; i < header.length; i++) {
    const cell = String(header[i] || "").trim();
    if (aliases.some((a) => a.trim() === cell || a === header[i])) return i;
  }
  return -1;
}

function parseWorkbook(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) return { rows: [], error: "no header" };

  const header = rows[headerIdx].map((h) => String(h || "").trim());
  const townIdx = header.indexOf("Town");
  if (townIdx < 0) return { rows: [], error: "no Town" };

  const keyIndexes = {};
  for (const key of DATA_KEYS) {
    const idx = findCol(header, key, townIdx);
    if (idx < 0) return { rows: [], error: `missing ${key}` };
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
    out.push(obj);
  }
  return { rows: out };
}

function dateFromFilename(name) {
  const m = String(name).match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function rowKey(r) {
  return [
    r["Start Date"],
    r["Route Name"],
    r.Vehicle,
    r.Status,
    r["Planned POIs"],
    r["On-Time"],
    r["Missed POIs"],
  ].join("|");
}

function collectExcelFiles() {
  const seen = new Set();
  const files = [];
  for (const dir of FOLDERS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith(".xlsx") || name.startsWith("~$")) {
        continue;
      }
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (!st.isFile()) continue;
      // Prefer nested folder copies; skip duplicates by basename
      if (seen.has(name)) continue;
      seen.add(name);
      files.push({ name, full, fileDate: dateFromFilename(name) });
    }
  }
  return files.sort(
    (a, b) =>
      String(a.fileDate || "").localeCompare(String(b.fileDate || "")) ||
      a.name.localeCompare(b.name)
  );
}

function main() {
  const data = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
  const files = collectExcelFiles();

  console.log("Source Excel files found:", files.length);
  console.log("Morbi JSON rows:", data.length);

  const excelByDay = {};
  const excelKeys = new Map(); // key -> count
  const fileIssues = [];
  let excelTotal = 0;

  for (const file of files) {
    let parsed;
    try {
      parsed = parseWorkbook(file.full);
    } catch (e) {
      fileIssues.push({ file: file.name, error: String(e.message || e) });
      continue;
    }
    if (parsed.error) {
      fileIssues.push({ file: file.name, error: parsed.error });
      continue;
    }

    const dayCounts = {};
    for (const row of parsed.rows) {
      const d = row["Start Date"] || "(blank)";
      dayCounts[d] = (dayCounts[d] || 0) + 1;
      excelByDay[d] = (excelByDay[d] || 0) + 1;
      const k = rowKey(row);
      excelKeys.set(k, (excelKeys.get(k) || 0) + 1);
      excelTotal++;
    }

    const days = Object.keys(dayCounts);
    const odd =
      days.length !== 1 || (file.fileDate && !days.includes(file.fileDate));
    if (odd) {
      console.log(
        `NOTE ${file.name}: sheet dates ${JSON.stringify(dayCounts)} (filename ${file.fileDate})`
      );
    }
  }

  const jsonByDay = {};
  const jsonKeys = new Map();
  for (const row of data) {
    const d = row["Start Date"] || "(blank)";
    jsonByDay[d] = (jsonByDay[d] || 0) + 1;
    const k = rowKey(row);
    jsonKeys.set(k, (jsonKeys.get(k) || 0) + 1);
  }

  const allDays = [
    ...new Set([...Object.keys(excelByDay), ...Object.keys(jsonByDay)]),
  ].sort((a, b) => {
    const pa = a.split("-").reverse().join("-");
    const pb = b.split("-").reverse().join("-");
    return pa.localeCompare(pb);
  });

  console.log("\n=== Day-by-day (by Start Date inside sheet / JSON) ===");
  console.log("Date       | Excel | JSON | Status");
  console.log("-----------|-------|------|--------");

  const mismatches = [];
  for (const day of allDays) {
    const e = excelByDay[day] || 0;
    const j = jsonByDay[day] || 0;
    const ok = e === j;
    if (!ok) mismatches.push({ day, excel: e, json: j });
    const mark = ok ? "OK" : "MISMATCH";
    if (day.endsWith("-06-2026") || day.endsWith("-07-2026") || !ok) {
      console.log(
        `${day.padEnd(10)} | ${String(e).padStart(5)} | ${String(j).padStart(4)} | ${mark}`
      );
    }
  }

  // Calendar coverage
  function missingCalendar(monthLabel, y, m, daysInMonth) {
    const missing = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}`;
      if (!jsonByDay[key]) missing.push(key);
    }
    console.log(
      `\n${monthLabel} calendar days missing in JSON:`,
      missing.length ? missing.join(", ") : "none"
    );
  }
  missingCalendar("June 2026", 2026, 6, 30);
  missingCalendar("July 2026", 2026, 7, 31);

  // Row fingerprint diff
  let missingInJson = 0;
  let extraInJson = 0;
  const sampleMissing = [];
  const sampleExtra = [];
  for (const [k, count] of excelKeys) {
    const j = jsonKeys.get(k) || 0;
    if (j < count) {
      missingInJson += count - j;
      if (sampleMissing.length < 8) sampleMissing.push(`${k} (excel-json=${count - j})`);
    }
  }
  for (const [k, count] of jsonKeys) {
    const e = excelKeys.get(k) || 0;
    if (e < count) {
      extraInJson += count - e;
      if (sampleExtra.length < 8) sampleExtra.push(`${k} (json-excel=${count - e})`);
    }
  }

  const juneJson = Object.entries(jsonByDay)
    .filter(([d]) => d.endsWith("-06-2026"))
    .reduce((s, [, n]) => s + n, 0);
  const julyJson = Object.entries(jsonByDay)
    .filter(([d]) => d.endsWith("-07-2026"))
    .reduce((s, [, n]) => s + n, 0);
  const otherJson = data.length - juneJson - julyJson;

  console.log("\n=== Summary ===");
  console.log("Excel parseable rows:", excelTotal);
  console.log("JSON total rows:", data.length);
  console.log("JSON June rows:", juneJson);
  console.log("JSON July rows:", julyJson);
  console.log("JSON other-month rows:", otherJson);
  console.log("Day count mismatches:", mismatches.length ? mismatches : "none");
  console.log("Row fingerprints missing in JSON:", missingInJson);
  console.log("Row fingerprints extra in JSON:", extraInJson);
  if (sampleMissing.length) console.log("Sample missing:", sampleMissing);
  if (sampleExtra.length) console.log("Sample extra:", sampleExtra);
  if (fileIssues.length) console.log("File issues:", fileIssues);

  const ok =
    mismatches.length === 0 &&
    missingInJson === 0 &&
    extraInJson === 0 &&
    fileIssues.length === 0;
  console.log("\nALL DATA MATCHES:", ok);
}

main();
