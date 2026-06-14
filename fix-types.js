const fs = require('fs');

const files = [
  'packages/core-domain/src/application/upgrade/satellite-upgrade.service.ts',
  'packages/core-domain/src/application/validators/architecture-drift.service.ts',
  'packages/core-domain/src/application/validators/ruleset-validator.service.ts',
  'packages/core-domain/src/application/validators/rule-evaluation-engine.ts'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    content = content.replace(/options\?\.fileSystem;/g, 'options?.fileSystem as any;');
    content = content.replace(/options\?\.logger;/g, 'options?.logger as any;');
    content = content.replace(/options\?\.configParser;/g, 'options?.configParser as any;');
    content = content.replace(/options\?\.rulesetRepo;/g, 'options?.rulesetRepo as any;');
    
    fs.writeFileSync(f, content, 'utf8');
  }
});
