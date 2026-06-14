const fs = require('fs');

const files = [
  'packages/core-domain/src/application/upgrade/satellite-upgrade.service.ts',
  'packages/core-domain/src/application/validators/architecture-drift.service.ts',
  'packages/core-domain/src/application/validators/ruleset-validator.service.ts',
  'packages/core-domain/src/application/validators/rule-evaluation-engine.ts',
  'packages/core-domain/src/application/validators/evaluators/handlers/governance-rule.handler.ts'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Remove imports from infrastructure
    content = content.replace(/^import\s+.*from\s+['"](?:\.\.\/)+infrastructure.*['"];?\n/gm, '');

    // Replace fallbacks
    content = content.replace(/options\?\.fileSystem \?\? new NodeFileSystemProvider\(\)\.createFileSystem\(\)/g, 'options?.fileSystem');
    content = content.replace(/options\?\.logger \?\? new NestLoggerProvider\(\)\.createLogger\([^)]*\)/g, 'options?.logger');
    content = content.replace(/options\?\.configParser \?\? new YamlConfigParserProvider\(\)\.createConfigParser\([^)]*\)/g, 'options?.configParser');
    content = content.replace(/options\?\.rulesetRepo \?\? new DiskRulesetRepository\([^)]*\)/g, 'options?.rulesetRepo');
    
    // special cases
    content = content.replace(/this\.configParser = new YamlConfigParserProvider\(\)\.createConfigParser\([^)]*\);/g, 'if (!this.configParser) throw new Error("Config parser required");');
    
    // Throw error if not defined instead of silently failing, or let TypeScript catch it if it's strict
    
    fs.writeFileSync(f, content, 'utf8');
  }
});
