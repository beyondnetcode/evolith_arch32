const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let newLines = lines.filter(line => !line.includes('GT-603') && !line.includes('GT-631'));
  fs.writeFileSync(file, newLines.join('\n'));
}

processFile('reference/core/control-center/gaps/gap-tracking.md');
processFile('reference/core/control-center/gaps/gap-tracking.es.md');
processFile('reference/core/control-center/gaps/gap-reference-catalog.md');
processFile('reference/core/control-center/gaps/gap-reference-catalog.es.md');

let data = JSON.parse(fs.readFileSync('reference/core/control-center/maturity-reports/maturity-reconciliation.json', 'utf8'));
data.gaps.pending = data.gaps.pending - 2;
fs.writeFileSync('reference/core/control-center/maturity-reports/maturity-reconciliation.json', JSON.stringify(data, null, 2));
