#!/usr/bin/env node

/**
 * GT-167 native rule: every mandatoryEvidence entry in phase-gates.rules.json
 * that declares `schemaRef` or `templateRef` must point to an existing file,
 * and the template must reference its schema. Fails the build otherwise.
 */

import fs from "node:fs";
import path from "node:path";

// GT-556: root came from process.cwd() — running from src/ looked for
// src/src/rulesets/... and aborted.
import { REPO_ROOT, resolve as resolveKey } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const root = REPO_ROOT;
const rulesPath = resolveKey("phaseGateRules");
const rulesetDir = path.dirname(rulesPath);

const failures = [];

if (!fs.existsSync(rulesPath)) {
  console.error(`❌ phase-gates.rules.json not found at ${rulesPath}`);
  process.exit(1);
}

const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

// GT-578: every loop below is `?? []`, so a renamed `gates` key — or a
// `mandatoryEvidence` that stopped declaring refs — produced zero iterations and
// the script printed "✓ ... are consistent." having opened no template at all.
assertScanned((rules.gates ?? []).length, {
  what: "phase gates",
  where: `${rulesPath}#gates`,
});

let refsChecked = 0;

for (const gate of rules.gates ?? []) {
  for (const evidence of gate.mandatoryEvidence ?? []) {
    const label = `Phase ${gate.phase} (${gate.name}) · ${evidence.artifact}`;

    if (evidence.schemaRef || evidence.templateRef) refsChecked += 1;

    if (evidence.schemaRef) {
      const schemaPath = path.resolve(rulesetDir, evidence.schemaRef);
      if (!fs.existsSync(schemaPath)) {
        failures.push(`${label}: schemaRef points to missing file ${evidence.schemaRef}`);
      }
    }

    if (evidence.templateRef) {
      const templatePath = path.resolve(rulesetDir, evidence.templateRef);
      if (!fs.existsSync(templatePath)) {
        failures.push(`${label}: templateRef points to missing file ${evidence.templateRef}`);
        continue;
      }

      if (evidence.schemaRef) {
        const templateContent = fs.readFileSync(templatePath, "utf8");
        const schemaBasename = path.basename(evidence.schemaRef);
        if (!templateContent.includes(schemaBasename)) {
          failures.push(`${label}: template ${evidence.templateRef} does not reference its schema ${schemaBasename}`);
        }

        const esTemplatePath = templatePath.replace(/\.md$/, ".es.md");
        if (!fs.existsSync(esTemplatePath)) {
          failures.push(`${label}: bilingual counterpart missing for ${evidence.templateRef}`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error("❌ Phase-gate template/schema validation failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

assertScanned(refsChecked, {
  what: "mandatoryEvidence entries declaring a schemaRef or templateRef",
  where: `${rulesPath}#gates[].mandatoryEvidence`,
});

console.log(
  `✓ Phase-gate evidence templates and schemas are consistent ` +
  `(${(rules.gates ?? []).length} gate(s), ${refsChecked} evidence ref(s) resolved).`,
);
process.exit(0);
