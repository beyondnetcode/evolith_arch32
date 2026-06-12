import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');

const rulesetPath = path.join(rootDir, 'rulesets', 'architecture', 'f1-modular-monolith.rules.json');
const regoPath = path.join(rootDir, 'rulesets', 'opa', 'architecture.rego');
const nativeHandlerPath = path.join(rootDir, 'sdk', 'cli', 'src', 'core', 'validators', 'evaluators', 'handlers', 'architecture-rule.handler.ts');

const ruleset = JSON.parse(fs.readFileSync(rulesetPath, 'utf8'));
const regoContent = fs.readFileSync(regoPath, 'utf8');
const nativeContent = fs.readFileSync(nativeHandlerPath, 'utf8');

console.log('=== F1 Architecture Rule Coverage Matrix ===');
console.log('| Rule ID | Severity | OPA Coverage | Native Coverage |');
console.log('|---------|----------|--------------|-----------------|');

let allCovered = true;

for (const rule of ruleset.rules) {
  const ruleId = rule.id;
  const severity = rule.severity;

  // Check OPA
  // A rule is covered in OPA if there is a `violations[{"id": "F1-RXX"` block
  // and it is NOT just returning false (placeholder)
  const regoBlockRegex = new RegExp(`violations\\[\\{"id": "${ruleId}"[\\s\\S]*?\\}`);
  const match = regoContent.match(regoBlockRegex);
  let opaCoverage = false;
  if (match) {
    if (!match[0].includes('false\n\tmsg := "Placeholder"')) {
      opaCoverage = true;
    }
  }

  // Check Native
  // A rule is covered in Native if `rule.id === '${ruleId}'` exists
  let nativeCoverage = nativeContent.includes(`rule.id === '${ruleId}'`);

  const opaStatus = opaCoverage ? '✅' : '❌';
  const nativeStatus = nativeCoverage ? '✅' : '❌';

  console.log(`| ${ruleId} | ${severity} | ${opaStatus} | ${nativeStatus} |`);

  if (!opaCoverage || !nativeCoverage) {
    allCovered = false;
  }
}

if (!allCovered) {
  console.error('\nError: Not all rules have full coverage in both evaluators.');
  process.exit(1);
} else {
  console.log('\nSuccess: 100% parity achieved across both evaluators.');
  process.exit(0);
}
