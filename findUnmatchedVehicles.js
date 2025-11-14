const fs = require('fs');
const XLSX = require('xlsx');

function findUnmatchedVehicles() {
  try {
    console.log('🔍 Finding unmatched vehicles from Excel...\n');
    
    // Read Excel file
    const workbook = XLSX.readFile('data/Copy of OCT 10 2025 osc.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Read vehicle templates
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    // Create a map of vehicle names for easy lookup
    const vehicleMap = new Map();
    vehicleTemplates.forEach(template => {
      vehicleMap.set(template.Vehicle, template);
    });
    
    const unmatchedVehicles = [];
    const matchedVehicles = [];
    
    // Process each row
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const vehicleIdentifier = row[2];
      
      if (!vehicleIdentifier || typeof vehicleIdentifier !== 'string') {
        continue;
      }
      
      const vehicleUpper = vehicleIdentifier.toUpperCase().trim();
      if (vehicleUpper === 'VEHICLE' || 
          vehicleUpper === 'VEHICLE ID' ||
          vehicleUpper.includes('TOTEL') ||
          vehicleUpper === '') {
        continue;
      }
      
      const tpoiValue = row[3];
      const tpoi = (tpoiValue !== null && tpoiValue !== undefined && tpoiValue !== '') 
        ? parseInt(tpoiValue) || null 
        : null;
      
      // Try to find match
      let matchedVehicle = null;
      const normalizedShortId = vehicleIdentifier.replace(/\s/g, '').toUpperCase().trim();
      
      for (const [templateVehicle, template] of vehicleMap.entries()) {
        const templateNormalized = templateVehicle.replace(/\s/g, '').toUpperCase();
        const matchStrategies = [
          templateVehicle === vehicleIdentifier.trim(),
          templateNormalized === normalizedShortId,
          templateVehicle.includes(vehicleIdentifier.trim()) || vehicleIdentifier.trim().includes(templateVehicle),
          templateVehicle.match(/GJ\s*\d+\s*[A-Z]+\s*\d+/)?.[0]?.replace(/\s/g, '').toUpperCase() === normalizedShortId,
          template.Assigned && template.Assigned.includes(vehicleIdentifier.trim()),
          templateVehicle.match(/\d{4}/)?.[0] && vehicleIdentifier.match(/\d{4}/)?.[0] && 
            templateVehicle.match(/\d{4}/)[0] === vehicleIdentifier.match(/\d{4}/)[0]
        ];
        
        if (matchStrategies.some(strategy => strategy)) {
          matchedVehicle = templateVehicle;
          break;
        }
      }
      
      if (!matchedVehicle) {
        unmatchedVehicles.push({
          excelVehicle: vehicleIdentifier.trim(),
          tpoi: tpoi
        });
      } else {
        matchedVehicles.push({
          excelVehicle: vehicleIdentifier.trim(),
          templateVehicle: matchedVehicle,
          tpoi: tpoi
        });
      }
    }
    
    console.log(`📊 Total Excel vehicles: ${matchedVehicles.length + unmatchedVehicles.length}`);
    console.log(`✅ Matched: ${matchedVehicles.length}`);
    console.log(`❌ Unmatched: ${unmatchedVehicles.length}\n`);
    
    if (unmatchedVehicles.length > 0) {
      console.log('❌ Unmatched vehicles:');
      unmatchedVehicles.forEach((v, i) => {
        console.log(`  ${i + 1}. "${v.excelVehicle}" (T-POI: ${v.tpoi || 'N/A'})`);
        
        // Try to find similar template vehicles
        const vehicleNum = v.excelVehicle.match(/\d{4}/)?.[0];
        if (vehicleNum) {
          const similar = Array.from(vehicleMap.keys()).filter(tv => 
            tv.includes(vehicleNum) || tv.match(/\d{4}/)?.[0] === vehicleNum
          );
          if (similar.length > 0) {
            console.log(`     Possible matches: ${similar.slice(0, 3).join(', ')}`);
          }
        }
      });
    }
    
    return { matchedVehicles, unmatchedVehicles };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { matchedVehicles: [], unmatchedVehicles: [] };
  }
}

if (require.main === module) {
  findUnmatchedVehicles();
}

module.exports = { findUnmatchedVehicles };

