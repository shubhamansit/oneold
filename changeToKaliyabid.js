const fs = require('fs');

try {
  console.log('Changing GJ 06 BX 0854 W-10 R-14 from S.SARDARNAGAR to KALIYABID...');
  
  // Read the current index.ts file
  const data = fs.readFileSync('data/index.ts', 'utf8');
  const lines = data.split('\n');
  
  // Find the line with S.SARDARNAGAR that has GJ 06 BX 0854 W-10 R-14
  let wardLineIndex = -1;
  for(let i = 0; i < lines.length; i++) {
    if(lines[i].includes('"Ward": "S.SARDARNAGAR"') && 
       i + 1 < lines.length && 
       lines[i + 1].includes('GJ 06 BX 0854 RUT W-10 R-14')) {
      wardLineIndex = i;
      break;
    }
  }
  
  if(wardLineIndex === -1) {
    console.error('Could not find S.SARDARNAGAR entry with GJ 06 BX 0854 W-10 R-14');
    return;
  }
  
  console.log('Found S.SARDARNAGAR entry at line:', wardLineIndex + 1);
  console.log('Current ward line:', lines[wardLineIndex]);
  
  // Change S.SARDARNAGAR to KALIYABID
  lines[wardLineIndex] = lines[wardLineIndex].replace('"Ward": "S.SARDARNAGAR"', '"Ward": "KALIYABID"');
  
  console.log('Updated ward line:', lines[wardLineIndex]);
  
  // Write the updated content back to the file
  const updatedContent = lines.join('\n');
  fs.writeFileSync('data/index.ts', updatedContent, 'utf8');
  
  console.log('Successfully changed GJ 06 BX 0854 W-10 R-14 from S.SARDARNAGAR to KALIYABID');
  
} catch (error) {
  console.error('Error:', error.message);
}