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
    total: 745,
    days: [
      35, 61, BLUE, 54, 79, 52, 58, 68, 75, BLUE, 88, 51, 67, 57, BLUE, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1382 - SWEEPER MACHINE",
    brand: "General",
    model: "General",
    total: 600,
    days: [
      67, 56, BLUE, 66, 43, 36, 53, 36, 53, BLUE, 65, 42, 41, 42, BLUE, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1383 - SWEEPER MACHINE",
    brand: "ELGIN",
    model: "EAGLE",
    total: 506,
    days: [
      41, 54, 0, 44, 43, 63, 36, 51, 45, 0, 43, 42, 40, 45, BLUE, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1385 - SWEEPER MACHINE",
    brand: "AMW",
    model: "1618 TP",
    total: 474,
    days: [
      42, 41, BLUE, 44, 34, BLUE, 47, 29, 50, BLUE, 46, 41, 62, 38, BLUE, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
];

function toCell(value, isOrange) {
  if (value === BLUE) return { value: "", isBlue: true };
  return { value, isOrange };
}

function buildJsonRows() {
  return [
    headers.map((value) => ({ value })),
    ...rows.map((row) =>
      [row.vehicle, row.brand, row.model, row.total, ...row.days].map((value) =>
        toCell(value, row.isOrange)
      )
    ),
  ];
}

async function createWorkbook(outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "oneold";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("May", {
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
      if (row.isOrange) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFCC99" },
        };
      }
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
  const jsonPath = path.join(root, "data", "daywiseDistance_2026_05.json");
  const workbookPath = path.join(root, "Daywise_Distance_May_2026.xlsx");
  const publicWorkbookPath = path.join(
    root,
    "public",
    "Daywise_Distance_May_2026.xlsx"
  );

  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ sheetName: "May", rows: buildJsonRows() }, null, 2)
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
