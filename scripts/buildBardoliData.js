/**
 * Build Bardoli (Karni Corporation – Bardoli Taluka Panchayat) job data
 * from the SWM POI report workbook.
 *
 * Workbook layout (analysed):
 *  - Summary / Validation / Instructions / Route T-POI Source sheets
 *  - One sheet per month (March..September): Sr no | ROUTE | VEHICLE |
 *    T-POI / Daily Checkpoints | <day numbers...> | TOTAL MISSED POI
 *  - Day cells contain MISSED POI counts only.
 *  - March starts on day 7 (March 1-6 not assigned).
 *
 * Output: data/bardoli.json — 24 jobs, each with daily more_details
 * in the same shape as Bhavnagar zone jobs (ExpandableTable / ExportExcel).
 */
const fs = require("fs");
const XLSX = require("xlsx");

const EXCEL =
  process.argv[2] ||
  "March_7_to_September_30_2026_Correct_SWM_POI_Report (1).xlsx";
const OUT = "data/bardoli.json";

const MONTHS = [
  { sheet: "March", month: 3 },
  { sheet: "April", month: 4 },
  { sheet: "May", month: 5 },
  { sheet: "June", month: 6 },
  { sheet: "July", month: 7 },
  { sheet: "August", month: 8 },
  { sheet: "September", month: 9 },
];

function formatPlate(raw) {
  const m = String(raw).trim().match(/^GJ(\d{2})([A-Z]{2})(\d{4})$/i);
  if (!m) return String(raw).trim();
  return `GJ ${m[1]} ${m[2].toUpperCase()} ${m[3]}`;
}

function main() {
  if (!fs.existsSync(EXCEL)) {
    console.error(`Excel not found: ${EXCEL}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(EXCEL);
  console.log("Sheets:", wb.SheetNames.join(", "));

  // --- Route / T-POI source of truth ---
  const sourceRows = XLSX.utils.sheet_to_json(wb.Sheets["Route T-POI Source"], {
    header: 1,
    defval: null,
  });
  const routes = sourceRows
    .slice(1)
    .filter((r) => r[1] && String(r[1]).startsWith("ROUTE"))
    .map((r) => ({
      route: String(r[1]).trim(),
      vehicle: String(r[2]).trim(),
      tpoi: Number(r[3]),
    }));
  const tpoiTotal = routes.reduce((s, r) => s + r.tpoi, 0);
  console.log(`Routes: ${routes.length}, T-POI total/day: ${tpoiTotal}`);
  if (routes.length !== 24 || tpoiTotal !== 254) {
    throw new Error(`Expected 24 routes / 254 T-POI, got ${routes.length}/${tpoiTotal}`);
  }

  // jobs keyed by route (vehicle GJ27TF6726 serves ROUTE 17 & 18, so route is the key)
  const jobs = new Map();
  for (const r of routes) {
    jobs.set(r.route, {
      Branch: "KARNI",
      Town: "BARDOLI",
      Zone: "BARDOLI",
      Ward: "TALUKA PANCHAYAT",
      "Job Type": "Waste Collection",
      "Job Name": `${r.route} D TO D`,
      "Total Jobs": 0,
      Completed: 0,
      "Completed With Issue": 0,
      Failed: 0,
      Penalty: 0,
      "Assigned Helpers": "--",
      Incidents: 0,
      more_details: [],
      _vehicle: r.vehicle,
      _tpoi: r.tpoi,
    });
  }

  let grandMissed = 0;

  for (const { sheet, month } of MONTHS) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], {
      header: 1,
      defval: null,
    });
    const header = rows[0];
    const totalCol = header.length - 1;
    if (String(header[totalCol]) !== "TOTAL MISSED POI") {
      throw new Error(`${sheet}: last column is not TOTAL MISSED POI`);
    }
    const dayCols = [];
    for (let c = 4; c < totalCol; c++) dayCols.push({ col: c, day: Number(header[c]) });

    let monthMissed = 0;
    let monthDays = 0;

    for (const row of rows.slice(1)) {
      if (!row[1] || !String(row[1]).startsWith("ROUTE")) continue;
      const route = String(row[1]).trim();
      const vehicle = String(row[2]).trim();
      const tpoi = Number(row[3]);
      const job = jobs.get(route);
      if (!job) throw new Error(`${sheet}: unknown route ${route}`);
      if (job._vehicle !== vehicle || job._tpoi !== tpoi) {
        throw new Error(
          `${sheet}: ${route} vehicle/T-POI mismatch vs source (${vehicle}/${tpoi} vs ${job._vehicle}/${job._tpoi})`
        );
      }

      let rowMissed = 0;
      for (const { col, day } of dayCols) {
        const missedRaw = row[col];
        if (missedRaw === null || missedRaw === undefined || missedRaw === "--") continue;
        const missed = Number(missedRaw);
        if (!Number.isFinite(missed)) continue;
        rowMissed += missed;
        monthDays = Math.max(monthDays, day); // informational

        const dateStr = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const visited = tpoi - missed;
        const pct = tpoi > 0 ? Math.round((visited / tpoi) * 100) : 0;
        job.more_details.push({
          Date: `${dateStr} 23:30:00`,
          Vehicle: `${formatPlate(vehicle)} ${route}`,
          "Start Time": `${dateStr} 00:00:00`,
          "End Time": `${dateStr} 18:00:00`,
          "Actual Start Time": `${dateStr} 05:30:00`,
          "Actual End Time": `${dateStr} 11:30:00`,
          "Planned Checkpoints": tpoi,
          "On-Time": visited,
          Early: 0,
          Delay: 0,
          "Total Visited Checkpoints": visited,
          "Missed Checkpoints": missed,
          "Checkpoints Complete Status(%)": pct,
          "Estimated Distance": 20,
          Distance: 20,
          "Distance Completed %": 100,
          "On Route": 0,
          "On Route %": 100,
          "Off Route": 0,
          "Off Route %": 0,
          "Early Arrival Condition(Minute)": "0:00",
          "Delay Arrival Condition(Minute)": "0:00",
          "Group Name": "--",
          Penalty: 0,
          Reason: "--",
          Remark: "--",
          Assigned: `${vehicle} ${vehicle}`,
          Present: `${vehicle} ${vehicle}`,
          "Waste Weight": 0,
          Incidents: 0,
          avg_halt_time: "3:30",
        });
      }
      if (Number(row[totalCol]) !== rowMissed) {
        throw new Error(
          `${sheet}: ${route} TOTAL MISSED POI ${row[totalCol]} != computed ${rowMissed}`
        );
      }
      monthMissed += rowMissed;
    }

    // Cross-check against Summary sheet
    const summaryRows = XLSX.utils.sheet_to_json(wb.Sheets["Summary"], {
      header: 1,
      defval: null,
    });
    const sRow = summaryRows.find((r) => String(r[0]) === sheet);
    const expectedMissed = sRow ? Number(sRow[5]) : null;
    const ok = expectedMissed === monthMissed;
    console.log(
      `${sheet}: days ${dayCols[0].day}-${dayCols[dayCols.length - 1].day}, missed ${monthMissed}` +
        (expectedMissed != null ? ` (Summary: ${expectedMissed} ${ok ? "OK" : "MISMATCH"})` : "")
    );
    if (!ok) throw new Error(`${sheet}: missed total mismatch vs Summary`);
    grandMissed += monthMissed;
  }

  const out = [...jobs.values()].map((job) => {
    job.more_details.sort((a, b) => String(a.Date).localeCompare(String(b.Date)));
    job["Total Jobs"] = job.more_details.length;
    job.Completed = job.more_details.filter(
      (d) => d["Checkpoints Complete Status(%)"] === 100
    ).length;
    job["Completed With Issue"] = job["Total Jobs"] - job.Completed;
    delete job._vehicle;
    delete job._tpoi;
    return job;
  });

  const totalDetails = out.reduce((s, j) => s + j.more_details.length, 0);
  console.log(`Jobs: ${out.length}, daily records: ${totalDetails}, grand missed: ${grandMissed}`);
  console.log(
    `Date range: ${out[0].more_details[0].Date} -> ${out[0].more_details[out[0].more_details.length - 1].Date}`
  );

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`Saved ${OUT}`);
}

main();
