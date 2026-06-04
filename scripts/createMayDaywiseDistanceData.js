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
    vehicle: "JC 400 MH 15 JM 1385 - SWEEPER MASHINE",
    brand: "General",
    model: "General",
    total: 1044,
    days: [
      33, 33, 0, 35, 47, 0, 37, 43, 40, 0, 36, 43, 49, 40, 37, 36, 0,
      40, 54, 55, 49, 45, 53, 0, 46, 44, 59, 0, 43, 47, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1384 - SWEEPER MACHINE",
    brand: "General",
    model: "General",
    total: 1142,
    days: [
      41, 48, 0, 47, 40, 46, 49, 34, 37, 0, 44, 46, 34, 49, 48, 44, 0,
      51, 73, 57, 42, 45, 42, 0, 63, 44, 37, 0, 37, 44, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1382 - SWEEPER MACHINE",
    brand: "General",
    model: "General",
    total: 1007,
    days: [
      33, 38, 0, 33, 42, 44, 40, 39, 41, 0, 33, 42, 38, 42, 35, 35, 0,
      0, 66, 60, 42, 43, 35, 0, 45, 48, 43, 0, 42, 48, 0,
    ],
  },
  {
    vehicle: "JC 400 MH 15 JM 1383 - SWEEPER MACHINE",
    brand: "General",
    model: "General",
    total: 1304,
    days: [
      52, 50, 0, 54, 48, 51, 47, 45, 50, 0, 53, 49, 48, 51, 53, 49, 0,
      55, 57, 47, 60, 52, 55, 0, 56, 58, 60, 0, 53, 51, 0,
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
