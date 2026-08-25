const fs = require('fs');
const path = require('path');

const csvPath = 'Route_Detail_Summary_11-06-2026_05-48-30_PM(1.csv';
const text = fs.readFileSync(csvPath, 'utf8');
const lines = text.split(/\r?\n/).filter((l) => l.trim().length);

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === ',' && !q) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

let headerIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (
    lines[i].includes('Town') &&
    lines[i].includes('Route Name') &&
    lines[i].includes('Vehicle')
  ) {
    headerIdx = i;
    break;
  }
}

if (headerIdx < 0) {
  console.error('Header row not found');
  process.exit(1);
}

const headers = parseCsvLine(lines[headerIdx]);
const townIdx = headers.indexOf('Town');
const keys = headers.slice(townIdx).map((h) => h.trim()).filter(Boolean);

const rows = [];
for (let i = headerIdx + 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  const slice = cols.slice(townIdx);
  if (!slice[0] || !String(slice[0]).trim()) continue;

  const obj = {};
  keys.forEach((k, idx) => {
    obj[k] = (slice[idx] ?? '').toString().trim();
  });
  if (!obj.Vehicle && !obj['Route Name']) continue;

  for (const nk of [
    'Planned POIs',
    'On-Time',
    'Early',
    'Delay',
    'Total Visited POIs',
    'Missed POIs',
  ]) {
    if (obj[nk] !== undefined && obj[nk] !== '') obj[nk] = Number(obj[nk]);
  }
  rows.push(obj);
}

const outDir = path.join('data', 'morbi');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'routeDetailSummary.json');
fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));
console.log('saved', outFile, 'rows', rows.length);
console.log('statuses', [...new Set(rows.map((r) => r.Status))]);
console.log('sample', rows[0]);
