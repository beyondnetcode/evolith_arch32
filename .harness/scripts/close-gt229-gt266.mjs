#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const EN_TRACK = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.md');
const ES_TRACK = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.es.md');
const EN_CATALOG = path.join(ROOT, 'reference/core/control-center/gaps/gap-reference-catalog.md');
const ES_CATALOG = path.join(ROOT, 'reference/core/control-center/gaps/gap-reference-catalog.es.md');
const EVIDENCE = path.join(ROOT, 'reference/core/control-center/evidence/gap-closure-evidence.json');

function replaceInFile(filePath, search, replace) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. EN tracking: change GT-229 and GT-266 from PENDING to DONE
replaceInFile(EN_TRACK,
  /(\| \[`GT-229`\].*\|) `PENDING` \|/,
  '$1 `DONE` |'
);
replaceInFile(EN_TRACK,
  /(\| \[`GT-266`\].*\|) `PENDING` \|/,
  '$1 `DONE` |'
);

// 2. ES tracking: change GT-229 and GT-266 from PENDIENTE to COMPLETADO
replaceInFile(ES_TRACK,
  /(\| \[`GT-229`\].*\|) `PENDIENTE` \|/,
  '$1 `COMPLETADO` |'
);
replaceInFile(ES_TRACK,
  /(\| \[`GT-266`\].*\|) `PENDIENTE` \|/,
  '$1 `COMPLETADO` |'
);

// 3. EN catalog: check GT-229 and GT-266 criteria
replaceInFile(EN_CATALOG,
  /#### GT-229\n\*\*Purpose:.*?\*\*Done When:\*\*\n(  - \[ \].*\n){3}/s,
  (match) => match.replace(/- \[ \]/g, '- [x]')
);
replaceInFile(EN_CATALOG,
  /#### GT-266\n\*\*Purpose:.*?\*\*Done When:\*\*\n(  - \[ \].*\n){6}/s,
  (match) => match.replace(/- \[ \]/g, '- [x]')
);

// 4. ES catalog: check GT-229 and GT-266 criteria
replaceInFile(ES_CATALOG,
  /#### GT-229\n\*\*Propósito:.*?\*\*Hecho Cuando:\*\*\n(  - \[ \].*\n){3}/s,
  (match) => match.replace(/- \[ \]/g, '- [x]')
);
replaceInFile(ES_CATALOG,
  /#### GT-266\n\*\*Propósito:.*?\*\*Hecho Cuando:\*\*\n(  - \[ \].*\n){6}/s,
  (match) => match.replace(/- \[ \]/g, '- [x]')
);

// 5. Add closure evidence
const evidence = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8'));
evidence.closures.push({
  id: 'GT-229',
  closedAt: '2026-06-24',
  closureCommit: '6ba915c1',
  evidence: [
    'packages/core-domain/src/application/validators/evaluators/native-evaluator.ts',
    'packages/core-domain/src/application/validators/evaluators/native-opa-parity.spec.ts',
    'packages/core-domain/src/application/validators/evaluators/aggregator-parity.spec.ts',
    'packages/core-domain/test/parity-fixtures/',
    '.harness/scripts/ci/28-native-evaluator-parity.mjs'
  ],
  validationCommands: [
    "npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='native-opa-parity' --no-coverage",
    "npx jest --config packages/core-domain/jest.config.js --rootDir packages/core-domain --testPathPatterns='aggregator-parity' --no-coverage",
    'node .harness/scripts/ci/28-native-evaluator-parity.mjs'
  ],
  dependencyDisposition: 'none',
  closureNote: 'NativeEvaluator with 12 domain handlers, 17 parity fixtures, 65 passing tests, CI parity gate passing.'
});
evidence.closures.push({
  id: 'GT-266',
  closedAt: '2026-06-24',
  closureCommit: '6ba915c1',
  evidence: [
    'packages/mcp-server/src/mcp/api-key-provisioning.service.ts',
    'packages/mcp-server/src/mcp/api-key-provisioning.service.spec.ts',
    'packages/mcp-server/src/mcp/mcp.module.ts'
  ],
  validationCommands: [
    "npx jest --config packages/mcp-server/jest.config.js --rootDir packages/mcp-server --testPathPatterns='api-key-provisioning' --no-coverage"
  ],
  dependencyDisposition: 'none',
  closureNote: 'ApiKeyProvisioningService with evk_ prefix, SHA-256 hashed storage, rotation, revocation, audit logging, and legacy migration. 27 tests passing.'
});
fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2) + '\n', 'utf8');

console.log('All changes applied.');
