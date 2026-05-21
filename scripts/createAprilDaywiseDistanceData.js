const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const BLUE = "__BLUE__";

const headers = [
  "Vehicle",
  "Vehicle Brand",
  "Vehicle Model",
  "Total Distance",
  ...Array.from({ length: 31 }, (_, index) =>
    String(index + 1).padStart(2, "0")
  ),
];

const rows = [
  {
    vehicle: "JC 400 MH 15 JM 1384 - SWEEPER MACHINE",
    brand: "ELGIN",
    model: "EAGLE",
    total: 1428,
    days: [
      55, 54, 60, 37, BLUE, 61, 63, 62, 71, 50, 41, 38, 50, 52, BLUE, 52,
      47, 61, BLUE, 65, 57, 43, 55, 52, 62, BLUE, 61, 79, 52, 48, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1382 - SWEEPER MACHINE",
    brand: "General",
    model: "General",
    total: 1420,
    days: [
      45, 45, 67, 56, BLUE, 39, 69, 41, 56, 48, 61, 70, 72, 61, BLUE, 59,
      57, 58, 0, 40, 62, 56, 34, 57, 55, 0, 66, 39, 50, 57, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1383 - SWEEPER MACHINE",
    brand: "ELGIN",
    model: "EAGLE",
    total: 1255,
    days: [
      41, 50, 55, 50, BLUE, 48, 56, 50, 49, 55, 50, 51, 56, 70, BLUE, 56,
      50, 52, BLUE, 60, 49, 70, 45, 44, 48, BLUE, 53, 47, 42, 40, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1385 - SWEEPER MACHINE",
    brand: "AMW",
    model: "1618 TP",
    total: 1152,
    days: [
      48, 31, 33, 30, BLUE, 49, 54, 51, 43, 45, 49, 50, 32, 40, BLUE, 50,
      46, 46, BLUE, 45, 44, 52, 43, 49, 41, BLUE, 40, 48, 42, 51, 0,
    ],
  },
];

function toCell(value) {
  return value === BLUE ? { value: "", isBlue: true } : { value };
}

function buildJsonRows() {
  return [
    headers.map((value) => ({ value })),
    ...rows.map((row) =>
      [row.vehicle, row.brand, row.model, row.total, ...row.days].map(toCell)
    ),
  ];
}

async function createWorkbook(outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "oneold";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("April", {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  worksheet.addRow(headers);
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6E6" },
    };
    cell.border = border();
  });

  rows.forEach((row) => {
    const excelRow = worksheet.addRow([
      row.vehicle,
      row.brand,
      row.model,
      row.total,
      ...row.days.map((day) => (day === BLUE ? "" : day)),
    ]);

    excelRow.height = 54;
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { size: 8 };
      cell.alignment = {
        vertical: "middle",
        horizontal: colNumber === 1 ? "left" : "center",
        wrapText: true,
      };
      cell.border = border();
    });

    row.days.forEach((day, index) => {
      if (day === BLUE) {
        const cell = excelRow.getCell(index + 5);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0000FF" },
        };
      }
    });
  });

  worksheet.columns = [
    { width: 22 },
    { width: 12 },
    { width: 13 },
    { width: 10 },
    ...Array.from({ length: 31 }, () => ({ width: 5 })),
  ];

  await workbook.xlsx.writeFile(outputPath);
}

function border() {
  return {
    top: { style: "thin", color: { argb: "FFD9D9D9" } },
    left: { style: "thin", color: { argb: "FFD9D9D9" } },
    bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
    right: { style: "thin", color: { argb: "FFD9D9D9" } },
  };
}

async function main() {
  const root = path.join("D:", "CODING", "oneold");
  const jsonPath = path.join(root, "data", "daywiseDistance_2026_04.json");
  const workbookPath = path.join(root, "Daywise_Distance_April_2026.xlsx");
  const publicWorkbookPath = path.join(
    root,
    "public",
    "Daywise_Distance_April_2026.xlsx"
  );

  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ sheetName: "April", rows: buildJsonRows() }, null, 2)
  );
  await createWorkbook(workbookPath);
  await createWorkbook(publicWorkbookPath);

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${workbookPath}`);
  console.log(`Wrote ${publicWorkbookPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
