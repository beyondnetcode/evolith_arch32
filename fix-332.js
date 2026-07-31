const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/GT-324(.*?)PENDING/g, "GT-324$1DEFERRED");
  content = content.replace(/GT-435(.*?)PENDING/g, "GT-435$1DEFERRED");
  content = content.replace(/GT-448(.*?)PENDING/g, "GT-448$1DEFERRED");
  fs.writeFileSync(file, content);
}

processFile('reference/core/control-center/gaps/gap-tracking.md');
processFile('reference/core/control-center/gaps/gap-tracking.es.md');
processFile('reference/core/control-center/gaps/gap-reference-catalog.md');
processFile('reference/core/control-center/gaps/gap-reference-catalog.es.md');
