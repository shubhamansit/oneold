const fs = require('fs');

try {
  console.log('Reading index.ts file...');
  const content = fs.readFileSync('data/index.ts', 'utf8');
  const lines = content.split('\n');
  
  console.log(`Total lines: ${lines.length}`);
  console.log(`File size: ${(content.length / 1024 / 1024).toFixed(2)} MB`);
  
  const lines2025 = lines.filter(line => line.includes('2025-'));
  console.log(`Lines containing 2025-: ${lines2025.length}`);
  
  // Check months
  const months = {};
  lines2025.forEach(line => {
    const match = line.match(/2025-(\d{2})/);
    if (match) {
      const month = match[1];
      months[month] = (months[month] || 0) + 1;
    }
  });
  
  console.log('\n2025 data by month:');
  Object.keys(months).sort().forEach(month => {
    console.log(`Month ${month}: ${months[month]} lines`);
  });
  
  // Check for specific vehicles
  const vehicleLines = lines.filter(line => line.includes('Vehicle'));
  console.log(`\nTotal vehicle lines: ${vehicleLines.length}`);
  
  // Sample vehicle data
  console.log('\nSample vehicle data:');
  vehicleLines.slice(0, 3).forEach(line => {
    console.log(line.trim());
  });
  
} catch (error) {
  console.error('Error:', error.message);
} 