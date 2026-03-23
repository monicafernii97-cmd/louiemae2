const fs = require('fs');
const content = fs.readFileSync('components/ProductImport.tsx', 'utf-8');
const lines = content.split('\n');
let balance = 0;
for(let i=636; i<1425; i++) {
  let line = lines[i] || '';
  // Need to account for <div ... /> and <div ...> and </div>
  let exactOpens = (line.match(/<div[\s>]/g) || []).length;
  let exactOpens2 = (line.match(/<div$/g) || []).length;
  let exactOpens3 = (line.match(/<div\/>/g) || []).length;
  let selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
  let closes = (line.match(/<\/div>/g) || []).length;
  let opens = exactOpens + exactOpens2 + exactOpens3 - selfCloses;
  balance += (opens - closes);
  if (opens !== closes) console.log('Line ' + (i+1) + ': open=' + opens + ' close=' + closes + ' bal=' + balance + ' -> ' + line.trim());
}
console.log('Final Balance: ' + balance);
