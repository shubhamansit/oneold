const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function normalizeJobName(name) {
  return String(name)
    .trim()
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-");
}

function normalizeForMatch(value) {
  return normalizeJobName(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

function isDateColumn(column) {
  const label = `${column.group || ""} ${column.label} ${column.key}`.toLowerCase();
  return label.includes("date");
}

function formatExtractedValue(value, column) {
  if (value === "" || value === null || value === undefined) {
    return value;
  }

  if (column.key === "Job Name" || column.label === "Job Name") {
    return normalizeJobName(value);
  }

  if (typeof value === "number" && isDateColumn(column) && value > 40000 && value < 60000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      const day = String(parsed.d).padStart(2, "0");
      const month = String(parsed.m).padStart(2, "0");
      return `${day}-${month}-${parsed.y}`;
    }
  }

  return value;
}

function columnKey(parent, child) {
  if (!parent || parent === child) return child;
  return `${parent}::${child}`;
}

function buildColumnGroups(rowTop, rowSub, startCol = 0) {
  const maxLen = Math.max(rowTop?.length || 0, rowSub?.length || 0);
  const headerGroups = [];
  const columns = [];

  let c = startCol;
  while (c < maxLen) {
    const top = String(rowTop?.[c] || "").trim();
    const sub = String(rowSub?.[c] || "").trim();

    if (!top && !sub) {
      c += 1;
      continue;
    }

    const groupLabel = top || sub;
    let span = 1;

    if (top) {
      while (c + span < maxLen) {
        const nextTop = String(rowTop?.[c + span] || "").trim();
        const nextSub = String(rowSub?.[c + span] || "").trim();
        if (nextTop) break;
        if (!nextSub) break;
        span += 1;
      }
    }

    const children = [];
    for (let j = 0; j < span; j += 1) {
      const childLabel =
        String(rowSub?.[c + j] || "").trim() ||
        String(rowTop?.[c + j] || "").trim();
      const key = columnKey(groupLabel, childLabel);
      children.push({ key, label: childLabel });
      columns.push({ key, label: childLabel, group: groupLabel });
    }

    headerGroups.push({
      label: groupLabel,
      colspan: span,
      rowSpan: span === 1 ? 2 : 1,
      children,
    });

    c += span;
  }

  return { headerGroups, columns };
}

function rowToObject(columns, row, startCol = 0) {
  const values = {};

  columns.forEach((column, index) => {
    const col = startCol + index;
    if (col >= row.length) return;
    const value = row[col];
    if (value !== "" && value !== null && value !== undefined) {
      values[column.key] = formatExtractedValue(value, column);
    }
  });

  return values;
}

function parseFileDate(fileName) {
  const match = fileName.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return null;

  const [, day, month, year] = match;
  return {
    display: `${day}-${month}-${year}`,
    iso: `${year}-${month}-${day}`,
    monthKey:
      Number(month) === 3
        ? "march"
        : Number(month) === 4
          ? "april"
          : Number(month) === 5
            ? "may"
            : null,
  };
}

function findSheetForJob(sheetNames, jobName) {
  const target = normalizeForMatch(jobName);
  if (!target) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const sheetName of sheetNames) {
    const normalizedSheet = normalizeForMatch(sheetName);
    if (!normalizedSheet.includes(target) && !target.includes(normalizedSheet)) {
      continue;
    }

    const score = Math.min(target.length, normalizedSheet.length);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sheetName;
    }
  }

  return bestMatch;
}

function extractWorkbook(excelPath, outputRoot) {
  const fileName = path.basename(excelPath);
  const dateInfo = parseFileDate(fileName);

  if (!dateInfo?.monthKey) {
    throw new Error(`Could not determine month from file name: ${fileName}`);
  }

  const workbook = XLSX.readFile(excelPath);
  const summarySheet = workbook.Sheets[workbook.SheetNames[0]];
  const summaryRows = XLSX.utils.sheet_to_json(summarySheet, {
    header: 1,
    defval: "",
  });

  const { headerGroups, columns } = buildColumnGroups(
    summaryRows[4],
    summaryRows[5],
    4
  );
  const reportRange = `${dateInfo.display} 12:00 AM to ${dateInfo.display} 11:59 PM`;

  const jobs = [];
  let srNo = 0;

  for (let i = 6; i < summaryRows.length; i += 1) {
    const row = summaryRows[i];
    const rawJobName = String(row[9] || "").trim();
    const jobName = normalizeJobName(rawJobName);

    if (!jobName || !jobName.includes("-")) continue;

    srNo += 1;
    const sheetName = findSheetForJob(workbook.SheetNames, jobName);
    const rowValues = rowToObject(columns, row, 4);

    jobs.push({
      srNo,
      id: jobName,
      sheetName,
      ...rowValues,
      "Job Name": jobName,
    });
  }

  const monthDir = path.join(outputRoot, dateInfo.monthKey, dateInfo.iso);
  const detailsDir = path.join(monthDir, "details");
  if (fs.existsSync(detailsDir)) {
    fs.rmSync(detailsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(detailsDir, { recursive: true });

  const summaryPath = path.join(monthDir, "summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        date: dateInfo.display,
        isoDate: dateInfo.iso,
        month: dateInfo.monthKey,
        reportRange,
        headerGroups,
        columns,
        jobs,
      },
      null,
      2
    )
  );

  for (const job of jobs) {
    if (!job.sheetName) continue;

    const detailSheet = workbook.Sheets[job.sheetName];
    const detailRows = XLSX.utils.sheet_to_json(detailSheet, {
      header: 1,
      defval: "",
    });

    const detailStructure = buildColumnGroups(detailRows[0], detailRows[1], 0);
    const detailData = [];

    for (let i = 2; i < detailRows.length; i += 1) {
      const row = detailRows[i];
      if (!row.some((cell) => cell !== "")) continue;

      detailData.push(rowToObject(detailStructure.columns, row, 0));
    }

    const safeId = normalizeJobName(job.id).replace(/[<>:"/\\|?*]/g, "_");
    fs.writeFileSync(
      path.join(detailsDir, `${safeId}.json`),
      JSON.stringify(
        {
          jobId: job.id,
          jobName: job.id,
          sheetName: job.sheetName,
          date: dateInfo.display,
          isoDate: dateInfo.iso,
          headerGroups: detailStructure.headerGroups,
          columns: detailStructure.columns,
          rows: detailData,
        },
        null,
        2
      )
    );
  }

  return {
    monthKey: dateInfo.monthKey,
    isoDate: dateInfo.iso,
    displayDate: dateInfo.display,
    jobCount: jobs.length,
    summaryPath,
  };
}

function updateMonthIndex(outputRoot, monthKey, isoDate, displayDate) {
  const indexPath = path.join(outputRoot, "index.json");
  const index = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, "utf8"))
    : {
        march: { label: "March", dates: [] },
        april: { label: "April", dates: [] },
        may: { label: "May", dates: [] },
      };

  const month = index[monthKey];
  if (!month) return;

  const existing = month.dates.find((item) => item.iso === isoDate);
  if (!existing) {
    month.dates.push({ iso: isoDate, label: displayDate });
    month.dates.sort((a, b) => a.iso.localeCompare(b.iso));
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

function listExcelFiles(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return /\.xlsx?$/i.test(targetPath) ? [targetPath] : [];
  }

  if (stat.isDirectory()) {
    return fs
      .readdirSync(targetPath)
      .filter((file) => /\.xlsx?$/i.test(file))
      .map((file) => path.join(targetPath, file))
      .sort((a, b) => a.localeCompare(b));
  }

  return [];
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      "Usage: node scripts/extractHmcJobDetails.js <excel-file-or-folder>"
    );
    process.exit(1);
  }

  const resolvedPath = path.resolve(inputPath);
  const excelFiles = listExcelFiles(resolvedPath);

  if (!excelFiles.length) {
    console.error("No Excel files found at:", resolvedPath);
    process.exit(1);
  }

  const outputRoot = path.join(__dirname, "..", "public", "data", "hmc");
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log(`Processing ${excelFiles.length} Excel file(s)...`);

  let successCount = 0;
  let failCount = 0;

  for (const excelPath of excelFiles) {
    try {
      const result = extractWorkbook(excelPath, outputRoot);
      updateMonthIndex(
        outputRoot,
        result.monthKey,
        result.isoDate,
        result.displayDate
      );

      console.log(
        `OK  ${path.basename(excelPath)} -> ${result.displayDate} (${result.jobCount} jobs)`
      );
      successCount += 1;
    } catch (error) {
      console.error(
        `FAIL ${path.basename(excelPath)}:`,
        error instanceof Error ? error.message : error
      );
      failCount += 1;
    }
  }

  console.log(`Done. Success: ${successCount}, Failed: ${failCount}`);
}

main();
