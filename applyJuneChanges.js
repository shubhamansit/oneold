const fs = require('fs');

try {
  console.log('=== APPLYING JUNE 2025 CHANGES ===');
  
  // Read the index.ts file
  const indexPath = 'data/index.ts';
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Create backup
  const backupPath = `data/index_backup_before_june_changes_${new Date().toISOString().replace(/[:.]/g, '-')}.ts`;
  fs.writeFileSync(backupPath, indexContent);
  console.log(`✅ Backup created: ${backupPath}`);
  
  // Split the content into lines to process line by line
  const lines = indexContent.split('\n');
  let vehicleReplacements = 0;
  let jobReplacements = 0;
  let inJune2025Section = false;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're entering a June 2025 section
    if (line.includes('"Date": "2025-06-')) {
      inJune2025Section = true;
    }
    
    // Check if we're leaving June 2025 section
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
      // Change vehicle name: "GJ 06 BX 0921" -> "GJ 04 GB 0132"
      if (line.includes('"Vehicle":') && line.includes('GJ 06 BX 0921')) {
        lines[i] = line.replace(/"Vehicle":\s*"GJ 06 BX 0921([^"]*)"/, '"Vehicle": "GJ 04 GB 0132$1"');
        vehicleReplacements++;
      }
      
      // Change job name in vehicle descriptions: "02-09-0921" -> "02-09-0132"
      if (line.includes('"Vehicle":') && line.includes('02-09-0921')) {
        lines[i] = line.replace(/02-09-0921/g, '02-09-0132');
        jobReplacements++;
      }
    }
  }
  
  // Join the lines back together
  const updatedContent = lines.join('\n');
  
  // Write the updated content back
  fs.writeFileSync(indexPath, updatedContent);
  
  console.log(`✅ Vehicle name changes in June 2025: ${vehicleReplacements}`);
  console.log(`✅ Job name changes in June 2025: ${jobReplacements}`);
  console.log(`✅ Total changes: ${vehicleReplacements + jobReplacements}`);
  console.log('✅ June 2025 changes applied successfully!');
  
  // Verify the changes
  const june2025Content = updatedContent.match(/"Date": "2025-06-[^"]*"[^}]*}/g) || [];
  let juneOldVehicle = 0;
  let juneNewVehicle = 0;
  let juneOldJob = 0;
  let juneNewJob = 0;
  
  june2025Content.forEach(entry => {
    if (entry.includes('"Vehicle":') && entry.includes('GJ 06 BX 0921')) {
      juneOldVehicle++;
    }
    if (entry.includes('"Vehicle":') && entry.includes('GJ 04 GB 0132')) {
      juneNewVehicle++;
    }
    if (entry.includes('02-09-0921')) {
      juneOldJob++;
    }
    if (entry.includes('02-09-0132')) {
      juneNewJob++;
    }
  });
  
  console.log(`\n=== JUNE 2025 VERIFICATION ===`);
  console.log(`Old vehicle name in June: ${juneOldVehicle} times`);
  console.log(`New vehicle name in June: ${juneNewVehicle} times`);
  console.log(`Old job name in June: ${juneOldJob} times`);
  console.log(`New job name in June: ${juneNewJob} times`);
  
  if (juneNewVehicle > 0 && juneNewJob > 0) {
    console.log(`✅ June 2025 changes applied successfully!`);
  } else {
    console.log(`❌ June 2025 changes may not have been applied correctly`);
  }
  
} catch (error) {
  console.error('Error applying June changes:', error.message);
} 