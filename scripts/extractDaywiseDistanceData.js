const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function main() {
  const workbook = new ExcelJS.Workbook();
  const source = path.join(
    "D:",
    "CODING",
    "oneold",
    "Daywise_Distance_13-04-2026.xlsx"
  );

  await workbook.xlsx.readFile(source);
  const worksheet =
    workbook.getWorksheet("Daywise Distance") || workbook.worksheets[0];

  const rows = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const fill = cell.fill;
      const fgColor =
        fill && fill.type === "pattern" ? fill.fgColor && fill.fgColor.argb : "";

      values[colNumber - 1] = {
        value: cell.value || "",
        isBlue: fgColor === "FF0000FF",
        isRedMarked: ["AB2", "AD2", "R5"].includes(cell.address),
      };
    });
    rows.push(values);
  });

  const output = path.join(
    "D:",
    "CODING",
    "oneold",
    "data",
    "daywiseDistance_2026_04_13.json"
  );

  fs.writeFileSync(output, JSON.stringify({ sheetName: worksheet.name, rows }, null, 2));
  console.log(`Wrote ${output}`);
  console.log(`${rows.length} rows x ${rows[0] ? rows[0].length : 0} columns`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
