const fs = require('fs');

// Read the large data file
console.log('Reading data file...');
const dataContent = fs.readFileSync('./data/index.ts', 'utf8');

// Extract the data arrays using regex
const wastZoneMatch = dataContent.match(/export const wastZone = (\[[\s\S]*?\]);/);
const eastZoneMatch = dataContent.match(/export const eastZone = (\[[\s\S]*?\]);/);
const generalMatch = dataContent.match(/export const general = (\[[\s\S]*?\]);/);

if (wastZoneMatch) {
  fs.writeFileSync('./data/wastZone.json', wastZoneMatch[1]);
  console.log('Created wastZone.json');
}

if (eastZoneMatch) {
  fs.writeFileSync('./data/eastZone.json', eastZoneMatch[1]);
  console.log('Created eastZone.json');
}

if (generalMatch) {
  fs.writeFileSync('./data/general.json', generalMatch[1]);
  console.log('Created general.json');
}

console.log('Data splitting complete!');