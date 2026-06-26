const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const folder = path.join(__dirname, "..", "public", "hmc-excel");
const extractScript = path.join(__dirname, "extractHmcJobDetails.js");

const monthFilter = process.argv[2] || null;
const yearFilter = process.argv[3] || "2026";

const files = fs
  .readdirSync(folder)
  .filter((file) => /\.xlsx?$/i.test(file))
  .filter((file) => {
    const match = file.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!match) return false;
    const [, , month, year] = match;
    if (yearFilter && year !== yearFilter) return false;
    if (monthFilter && month !== monthFilter.padStart(2, "0")) return false;
    return true;
  })
  .sort((a, b) => {
    const parse = (name) => {
      const match = name.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (!match) return name;
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    };
    return parse(a).localeCompare(parse(b));
  });

console.log(`Found ${files.length} files. Processing datewise...\n`);

let success = 0;
let failed = 0;

for (const file of files) {
  const filePath = path.join(folder, file);
  process.stdout.write(`[${success + failed + 1}/${files.length}] ${file} ... `);
  try {
    execSync(`node "${extractScript}" "${filePath}"`, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    console.log("OK");
    success += 1;
  } catch (error) {
    const message =
      error.stdout?.split("\n").find((line) => line.startsWith("FAIL")) ||
      error.stderr?.trim() ||
      error.message;
    console.log("FAILED");
    console.log(message);
    failed += 1;
  }
}

console.log(`\nFinished. Success: ${success}, Failed: ${failed}`);
