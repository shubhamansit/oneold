const fs = require('fs');
const XLSX = require('xlsx');

function checkTPOIMapping() {
  try {
    // Read Excel file
    const workbook = XLSX.readFile('data/Copy of OCT 10 2025 osc.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Read vehicle templates
    const vehicleTemplatesData = fs.readFileSync('vehicleTemplates.json', 'utf8');
    const vehicleTemplates = JSON.parse(vehicleTemplatesData);
    
    const vehicleMap = new Map();
    vehicleTemplates.forEach(template => {
      vehicleMap.set(template.Vehicle, template);
    });
    
    const matchedWithoutTPOI = [];
    const matchedWithTPOI = [];
    const unmatched = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const vehicleIdentifier = row[2];
      
      if (!vehicleIdentifier || typeof vehicleIdentifier !== 'string') continue;
      
      const vehicleUpper = vehicleIdentifier.toUpperCase().trim();
      if (vehicleUpper === 'VEHICLE' || vehicleUpper === 'VEHICLE ID' || 
          vehicleUpper.includes('TOTEL') || vehicleUpper === '') continue;
      
      const tpoiValue = row[3];
      let tpoi = null;
      if (tpoiValue !== null && tpoiValue !== undefined && tpoiValue !== '') {
        const parsedTpoi = parseInt(tpoiValue);
        if (!isNaN(parsedTpoi)) tpoi = parsedTpoi;
      }
      
      // Try to find match
      let matchedVehicle = null;
      const normalizedShortId = vehicleIdentifier.replace(/\s/g, '').toUpperCase().trim();
      const excelVehicleNum = vehicleIdentifier.match(/\d{4}/)?.[0];
      
      for (const [templateVehicle, template] of vehicleMap.entries()) {
        const templateNormalized = templateVehicle.replace(/\s/g, '').toUpperCase();
        const templateVehicleNum = templateVehicle.match(/\d{4}/)?.[0];
        const routeMatch = templateVehicle.match(/(\d{2}-\d{2}-\d{4})/);
        const routeVehicleNum = routeMatch ? routeMatch[1].split('-')[2] : null;
        
        const matchStrategies = [
          templateVehicle === vehicleIdentifier.trim(),
          templateNormalized === normalizedShortId,
          templateVehicle.includes(vehicleIdentifier.trim()) || vehicleIdentifier.trim().includes(templateVehicle),
          templateVehicle.match(/GJ\s*\d+\s*[A-Z]+\s*\d+/)?.[0]?.replace(/\s/g, '').toUpperCase() === normalizedShortId,
          template.Assigned && template.Assigned.includes(vehicleIdentifier.trim()),
          templateVehicleNum && excelVehicleNum && templateVehicleNum === excelVehicleNum,
          routeVehicleNum && excelVehicleNum && routeVehicleNum === excelVehicleNum,
          templateVehicleNum && excelVehicleNum && 
            templateVehicleNum.slice(-3) === excelVehicleNum.slice(-3) &&
            templateVehicleNum.length === excelVehicleNum.length
        ];
        
        if (matchStrategies.some(s => s)) {
          matchedVehicle = templateVehicle;
          break;
        }
      }
      
      if (matchedVehicle) {
        if (tpoi !== null) {
          matchedWithTPOI.push({ excel: vehicleIdentifier.trim(), template: matchedVehicle, tpoi });
        } else {
          matchedWithoutTPOI.push({ excel: vehicleIdentifier.trim(), template: matchedVehicle });
        }
      } else {
        unmatched.push({ excel: vehicleIdentifier.trim(), tpoi });
      }
    }
    
    console.log(`📊 Total Excel vehicles: ${matchedWithTPOI.length + matchedWithoutTPOI.length + unmatched.length}`);
    console.log(`✅ Matched with T-POI: ${matchedWithTPOI.length}`);
    console.log(`⚠️  Matched without T-POI: ${matchedWithoutTPOI.length}`);
    console.log(`❌ Unmatched: ${unmatched.length}\n`);
    
    if (matchedWithoutTPOI.length > 0) {
      console.log('⚠️  Matched vehicles without T-POI:');
      matchedWithoutTPOI.forEach(v => console.log(`  - "${v.excel}" → "${v.template}"`));
    }
    
    if (unmatched.length > 0) {
      console.log('\n❌ Unmatched vehicles:');
      unmatched.forEach(v => console.log(`  - "${v.excel}" (T-POI: ${v.tpoi || 'N/A'})`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  checkTPOIMapping();
}

module.exports = { checkTPOIMapping };

