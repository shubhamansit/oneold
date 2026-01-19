const fs = require('fs');

function checkRoute(zoneFile, routeCode) {
  try {
    const data = JSON.parse(fs.readFileSync(zoneFile, 'utf8'));
    const route = data.find(r => r['Job Name'] && r['Job Name'].includes(routeCode));
    
    if (!route) {
      return { found: false, routeCode, zoneFile };
    }
    
    if (!route.more_details || !Array.isArray(route.more_details)) {
      return { found: true, routeCode, zoneFile, hasDetails: false };
    }
    
    const nov = route.more_details.filter(d => d.Date && d.Date.startsWith('2025-11'));
    const dec = route.more_details.filter(d => d.Date && d.Date.startsWith('2025-12'));
    const total = route.more_details.length;
    
    return {
      found: true,
      routeCode,
      zoneFile,
      hasDetails: true,
      november: nov.length,
      december: dec.length,
      total: total,
      vehicle: route.Vehicle || 'N/A'
    };
  } catch (error) {
    return { error: error.message, routeCode, zoneFile };
  }
}

// Check routes in all zone files
const routes = ['10-14-0854', '12-06-0780', '13-13-0482', '11-10-0182', '12-10-0306'];
const zoneFiles = [
  'data/wastZone.json',
  'data/eastZone.json',
  'data/general.json',
  'data/brigrajsinh.json'
];

console.log('Checking routes in zone files...\n');

routes.forEach(routeCode => {
  console.log(`\n📍 Route: ${routeCode}`);
  console.log('─'.repeat(50));
  
  let foundInAnyZone = false;
  
  zoneFiles.forEach(zoneFile => {
    const result = checkRoute(zoneFile, routeCode);
    
    if (result.found) {
      foundInAnyZone = true;
      const zoneName = zoneFile.split('/').pop();
      
      if (result.hasDetails) {
        const status = (result.november === 30 && result.december === 31) ? '✅' : '⚠️';
        console.log(`  ${status} ${zoneName}:`);
        console.log(`     Vehicle: ${result.vehicle}`);
        console.log(`     November: ${result.november} records (expected: 30)`);
        console.log(`     December: ${result.december} records (expected: 31)`);
        console.log(`     Total: ${result.total} records`);
      } else {
        console.log(`  ⚠️  ${zoneName}: Found but no more_details`);
      }
    }
  });
  
  if (!foundInAnyZone) {
    console.log('  ❌ Not found in any zone file');
  }
});

// Check monthly data files
console.log('\n\n📊 Checking monthly data files...\n');

['monthlyData_2025_11.json', 'monthlyData_2025_12.json'].forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`❌ ${file} not found`);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const month = file.includes('11') ? 'November' : 'December';
  
  console.log(`\n${month} 2025 (${file}):`);
  routes.forEach(routeCode => {
    const records = data.filter(r => r.Vehicle && r.Vehicle.includes(routeCode));
    const expected = month === 'November' ? 30 : 31;
    const status = records.length === expected ? '✅' : '⚠️';
    console.log(`  ${status} ${routeCode}: ${records.length} records (expected: ${expected})`);
  });
});
