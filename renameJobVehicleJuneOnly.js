const fs = require('fs');

try {
  console.log('=== RENAMING JOB AND VEHICLE FOR JUNE 2025 ONLY ===');
  
  // Read the index.ts file
  const indexPath = 'data/index.ts';
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Create backup
  const backupPath = `data/index_backup_before_june_rename_${new Date().toISOString().replace(/[:.]/g, '-')}.ts`;
  fs.writeFileSync(backupPath, indexContent);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Split the content into lines to process line by line
  const lines = indexContent.split('\n');
  let jobReplacements = 0;
  let vehicleReplacements = 0;
  let inJune2025Section = false;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're entering a June 2025 section
    if (line.includes('"Date": "2025-06-')) {
      inJune2025Section = true;
    }
    
    // Check if we're leaving June 2025 section (next month or different year)
    if (line.includes('"Date": "2025-07-') || 
        line.includes('"Date": "2025-08-') || 
        line.includes('"Date": "2025-09-') || 
        line.includes('"Date": "2025-10-') || 
        line.includes('"Date": "2025-11-') || 
        line.includes('"Date": "2025-12-') ||
        (line.includes('"Date": "2025-') && !line.includes('"Date": "2025-06-'))) {
      inJune2025Section = false;
    }
    
    // Only make replacements if we're in June 2025 section
    if (inJune2025Section) {
      // Replace job name
      if (line.includes('"Job Name":') && line.includes('02-09-0921')) {
        lines[i] = line.replace(/"Job Name":\s*"02-09-0921([^"]*)"/, '"Job Name": "02-09-0132$1"');
        jobReplacements++;
      }
      
      // Replace vehicle name
      if (line.includes('"Vehicle":') && line.includes('GJ 06 BX 0921')) {
        lines[i] = line.replace(/"Vehicle":\s*"GJ 06 BX 0921([^"]*)"/, '"Vehicle": "GJ 04 GB 0132$1"');
        vehicleReplacements++;
      }
    }
  }
  
  // Join the lines back together
  const updatedContent = lines.join('\n');
  
  // Write the updated content back
  fs.writeFileSync(indexPath, updatedContent);
  
  console.log(`✅ Job name replacements (June 2025 only): ${jobReplacements}`);
  console.log(`✅ Vehicle name replacements (June 2025 only): ${vehicleReplacements}`);
  console.log(`✅ Total replacements: ${jobReplacements + vehicleReplacements}`);
  console.log('✅ Index.ts file updated successfully!');
  
  // Verify the changes
  const newJobCount = (updatedContent.match(/"Job Name":\s*"02-09-0132/g) || []).length;
  const newVehicleCount = (updatedContent.match(/"Vehicle":\s*"GJ 04 GB 0132/g) || []).length;
  
  console.log(`\n=== VERIFICATION ===`);
  console.log(`New job name "02-09-0132" found: ${newJobCount} times`);
  console.log(`New vehicle name "GJ 04 GB 0132" found: ${newVehicleCount} times`);
  
  // Check if any old names still exist in June 2025
  const june2025Content = updatedContent.match(/"Date": "2025-06-[^"]*"[^}]*}/g) || [];
  let oldJobInJune = 0;
  let oldVehicleInJune = 0;
  
  june2025Content.forEach(entry => {
    if (entry.includes('"Job Name":') && entry.includes('02-09-0921')) {
      oldJobInJune++;
    }
    if (entry.includes('"Vehicle":') && entry.includes('GJ 06 BX 0921')) {
      oldVehicleInJune++;
    }
  });
  
  if (oldJobInJune > 0 || oldVehicleInJune > 0) {
    console.log(`⚠️  Warning: Old names still found in June 2025:`);
    console.log(`   Old job name "02-09-0921": ${oldJobInJune} times`);
    console.log(`   Old vehicle name "GJ 06 BX 0921": ${oldVehicleInJune} times`);
  } else {
    console.log(`✅ All old names have been successfully replaced in June 2025!`);
  }
  
  // Show sample of June 2025 entries to verify
  console.log(`\n=== SAMPLE JUNE 2025 ENTRIES ===`);
  const juneEntries = june2025Content.slice(0, 3);
  juneEntries.forEach((entry, index) => {
    const jobMatch = entry.match(/"Job Name":\s*"([^"]*)"/);
    const vehicleMatch = entry.match(/"Vehicle":\s*"([^"]*)"/);
    const dateMatch = entry.match(/"Date":\s*"([^"]*)"/);
    
    console.log(`Entry ${index + 1}:`);
    console.log(`  Date: ${dateMatch ? dateMatch[1] : 'N/A'}`);
    console.log(`  Job: ${jobMatch ? jobMatch[1] : 'N/A'}`);
    console.log(`  Vehicle: ${vehicleMatch ? vehicleMatch[1] : 'N/A'}`);
    console.log('');
  });
  
} catch (error) {
  console.error('Error renaming job and vehicle for June 2025:', error.message);
} 