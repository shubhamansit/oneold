import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  morbiDateKey,
  parseMorbiStartDate,
  type MorbiRouteDetailRow,
} from "@/lib/morbiTypes";

const TABLE_HEADERS = [
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
] as const;

const KPI_LABELS = [
  "Planned POIs",
  "On-Time",
  "Early",
  "Delay",
  "Total Visited POIs",
  "Missed POIs",
] as const;

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function formatDdMmYyyy(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function dayLabelForRow(row: MorbiRouteDetailRow) {
  return (
    String(row["Report Date"] || "").trim() ||
    String(row["Start Date"] || "").trim()
  );
}

function buildDurationLabel(dayLabel: string) {
  const d = parseMorbiStartDate(dayLabel);
  if (!d) return "Duration: from — to —";
  const label = formatDdMmYyyy(d);
  return `Duration: from ${label} 12:00:00 AM to ${label} 11:59:59 PM`;
}

function sumNumeric(
  rows: MorbiRouteDetailRow[],
  key: keyof MorbiRouteDetailRow
) {
  return rows.reduce((sum, row) => {
    const n = Number(row[key]);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function rowValues(row: MorbiRouteDetailRow): (string | number)[] {
  return TABLE_HEADERS.map((key) => {
    const value = row[key];
    if (value === undefined || value === null) return "";
    return value as string | number;
  });
}

/** Excel sheet names max 31 chars; disallow \ / ? * [ ] */
function safeSheetName(dayLabel: string, used: Set<string>) {
  let base = dayLabel.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Day";
  let name = base;
  let i = 2;
  while (used.has(name)) {
    const suffix = ` (${i})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i++;
  }
  used.add(name);
  return name;
}

function groupRowsByDay(rows: MorbiRouteDetailRow[]) {
  const groups = new Map<string, MorbiRouteDetailRow[]>();
  for (const row of rows) {
    const label = dayLabelForRow(row);
    if (!label) continue;
    const list = groups.get(label);
    if (list) list.push(row);
    else groups.set(label, [row]);
  }

  return [...groups.entries()].sort((a, b) => {
    const ka = morbiDateKey(a[0]) || a[0];
    const kb = morbiDateKey(b[0]) || b[0];
    return ka.localeCompare(kb);
  });
}

function writeDaySheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  dayLabel: string,
  rows: MorbiRouteDetailRow[]
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  const kpiValues = [
    sumNumeric(rows, "Planned POIs"),
    sumNumeric(rows, "On-Time"),
    sumNumeric(rows, "Early"),
    sumNumeric(rows, "Delay"),
    sumNumeric(rows, "Total Visited POIs"),
    sumNumeric(rows, "Missed POIs"),
  ];

  sheet.getCell("A1").value = "Route Detail Summary";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A2").value = buildDurationLabel(dayLabel);
  sheet.getCell("A3").value = "";
  sheet.getCell("A4").value = "";

  const headerRowIndex = 5;
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.getCell(1).value = KPI_LABELS[0];
  headerRow.getCell(2).value = kpiValues[0];
  TABLE_HEADERS.forEach((label, idx) => {
    const cell = headerRow.getCell(idx + 4);
    cell.value = label;
    cell.font = { bold: true };
  });

  rows.forEach((row, rowIdx) => {
    const excelRow = sheet.getRow(headerRowIndex + 1 + rowIdx);
    if (rowIdx < KPI_LABELS.length - 1) {
      excelRow.getCell(1).value = KPI_LABELS[rowIdx + 1];
      excelRow.getCell(2).value = kpiValues[rowIdx + 1];
    }
    rowValues(row).forEach((value, colIdx) => {
      const cell = excelRow.getCell(colIdx + 4);
      cell.value = value;
      if (colIdx <= 2) {
        cell.font = { color: { argb: "FF0000FF" } };
      }
    });
  });

  for (let i = rows.length; i < KPI_LABELS.length - 1; i++) {
    const excelRow = sheet.getRow(headerRowIndex + 1 + i);
    excelRow.getCell(1).value = KPI_LABELS[i + 1];
    excelRow.getCell(2).value = kpiValues[i + 1];
  }

  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 3;
  const widths = [
    10, 10, 10, 14, 16, 22, 12, 22, 12, 12, 14, 14, 12, 10, 8, 8, 12, 12,
  ];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 4).width = w;
  });
}

/**
 * Export Morbi rows in the original Route Detail Summary Excel layout.
 * Multiple days → one worksheet per day (named DD-MM-YYYY).
 */
export async function exportMorbiRowsToXlsx(
  rows: MorbiRouteDetailRow[],
  fileName = `Route_Detail_Summary_${stamp()}.xlsx`
) {
  const workbook = new ExcelJS.Workbook();
  const dayGroups = groupRowsByDay(rows);
  const usedNames = new Set<string>();

  if (dayGroups.length === 0) {
    writeDaySheet(workbook, "Route Detail Summary", "", []);
  } else if (dayGroups.length === 1) {
    const [dayLabel, dayRows] = dayGroups[0];
    writeDaySheet(workbook, "Route Detail Summary", dayLabel, dayRows);
  } else {
    for (const [dayLabel, dayRows] of dayGroups) {
      writeDaySheet(
        workbook,
        safeSheetName(dayLabel, usedNames),
        dayLabel,
        dayRows
      );
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
}
