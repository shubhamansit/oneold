const fs = require('fs');
const XLSX = require('xlsx');

function checkMissedVehicles() {
  try {
    console.log('🔍 Checking for vehicles that were missed in BMC August 2025 processing...');
    
    // Read the original Excel file to see all vehicles
    const workbook = XLSX.readFile('BMC Aug 2025.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📊 Total rows in Excel file: ${excelData.length}`);
    
    // Extract all vehicles from Excel
    const excelVehicles = [];
    for (let i = 2; i < excelData.length; i++) { // Skip header rows
      const row = excelData[i];
      if (row && row.length > 2) {
        const route = row[1];
        const vehicle = row[2];
        if (route && vehicle) {
          excelVehicles.push({
            route: route,
            vehicle: vehicle,
            row: i
          });
        }
      }
    }
    
    console.log(`📊 Total vehicles in Excel: ${excelVehicles.length}`);
    
    // Read the generated monthly data to see which vehicles were processed
    const monthlyData = JSON.parse(fs.readFileSync('monthlyData_2025_08.json', 'utf8'));
    const processedVehicles = new Set();
    monthlyData.forEach(record => {
      processedVehicles.add(record.Vehicle);
    });
    
    console.log(`📊 Total vehicles in monthly data: ${processedVehicles.size}`);
    
    // Find missed vehicles
    const missedVehicles = [];
    excelVehicles.forEach(excelVehicle => {
      let found = false;
      
      // Check if this Excel vehicle was processed
      for (const processedVehicle of processedVehicles) {
        const excelVehicleStr = String(excelVehicle.vehicle);
        const matchStrategies = [
          processedVehicle === excelVehicleStr,
          processedVehicle.replace(/\s/g, '') === excelVehicleStr.replace(/\s/g, ''),
          processedVehicle.includes(excelVehicleStr),
          excelVehicleStr.includes(processedVehicle.split(' ')[0])
        ];
        
        if (matchStrategies.some(strategy => strategy)) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        missedVehicles.push(excelVehicle);
      }
    });
    
    console.log(`\n❌ MISSED VEHICLES (${missedVehicles.length}):`);
    missedVehicles.forEach((vehicle, index) => {
      console.log(`${index + 1}. Route: ${vehicle.route}, Vehicle: ${vehicle.vehicle}`);
    });
    
    // Show sample data for missed vehicles
    if (missedVehicles.length > 0) {
      console.log(`\n📊 Sample data for first 3 missed vehicles:`);
      missedVehicles.slice(0, 3).forEach((vehicle, index) => {
        const row = excelData[vehicle.row];
        const day1 = row[3];
        const day15 = row[17];
        const day31 = row[33];
        const total = row[34];
        
        console.log(`\n${index + 1}. ${vehicle.vehicle} (${vehicle.route}):`);
        console.log(`   Day 1: ${day1}, Day 15: ${day15}, Day 31: ${day31}`);
        console.log(`   Total missed checkpoints: ${total}`);
      });
    }
    
    return missedVehicles;
    
  } catch (error) {
    console.error('❌ Error checking missed vehicles:', error);
    return [];
  }
}

// Run if called directly
if (require.main === module) {
  checkMissedVehicles();
}

module.exports = { checkMissedVehicles };