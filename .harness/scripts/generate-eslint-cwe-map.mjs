#!/usr/bin/env node
/**
 * GT-664 — compile the ESLint → CWE map INTO the domain package, and check the
 * two halves of every claim it makes before doing so.
 *
 * Same rule as `generate-iso-5055-index.mjs`, for the same measured reason: the
 * core-api image copies `src/rulesets` to `/app/corpus/rulesets`, so a domain
 * module that requires a corpus JSON by relative path dies at boot with
 * MODULE_NOT_FOUND. The JSON stays the thing a human edits; this emits the copy
 * the domain compiles against, and `eslint-cwe-map.spec.ts` fails if the two
 * ever disagree.
 *
 * WHAT IT VERIFIES, beyond copying
 * --------------------------------
 *  1. Every `cwe` is one of the 138 ISO/IEC 5055 names. A row pointing at a CWE
 *     outside the standard would be silently inert — it could never raise the
 *     measurement and nobody would notice it was dead.
 *  2. Every `ruleId` is a real ESLint CORE rule, and the `eslintDescription`
 *     recorded next to it still equals `meta.docs.description` from the
 *     installed ESLint. This is the anti-drift half: the whole file is an
 *     argument from what a rule DOES, so a rule that was renamed, removed or
 *     redefined invalidates the argument, and that must fail here rather than
 *     quietly keep mapping.
 *  3. No row is deprecated. A deprecated rule stops firing when a tenant
 *     upgrades, and a mapping that silently stops contributing looks exactly
 *     like a repository that got better.
 *
 * ESLint is a real dependency of this monorepo's workspaces, so it resolves
 * here. If it ever does not, this script FAILS rather than skipping the checks:
 * a guard that degrades to a no-op when its input is missing is the shape of
 * false assurance this corpus keeps finding.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = join(ROOT, 'src/rulesets/standards/eslint-cwe-map.json');
const WEAKNESSES = join(ROOT, 'src/rulesets/standards/iso-5055-weaknesses.json');
const TARGET = join(
  ROOT,
  'src/packages/core-domain/src/application/validators/standards/eslint-cwe-map.generated.ts',
);

const fail = (message) => {
  console.error(`✗ generate-eslint-cwe-map: ${message}`);
  process.exit(1);
};

const raw = JSON.parse(readFileSync(SOURCE, 'utf8'));
const entries = Array.isArray(raw.entries) ? raw.entries : [];
if (entries.length === 0) fail('the map declares no entries. Refusing to compile in an empty table.');

// --- 1. every CWE is one the standard names --------------------------------
const standard = JSON.parse(readFileSync(WEAKNESSES, 'utf8'));
const named = new Set(Object.values(standard.measures).flat().map(Number));
for (const entry of entries) {
  if (!named.has(Number(entry.cwe))) {
    fail(
      `\`${entry.ruleId}\` maps to CWE-${entry.cwe}, which ISO/IEC 5055 does not name. ` +
        'A row outside the standard can never raise the measurement — it is dead, not conservative.',
    );
  }
}

// --- 2 & 3. every rule id is a live ESLint core rule, described as recorded --
const require = createRequire(join(ROOT, 'package.json'));
let builtinRules;
try {
  ({ builtinRules } = require('eslint/use-at-your-own-risk'));
} catch (err) {
  fail(
    `ESLint could not be resolved from ${ROOT} (${err.message}). This script verifies every row ` +
      'against the installed rule metadata and will not emit a map it could not check.',
  );
}

for (const entry of entries) {
  const rule = builtinRules.get(entry.ruleId);
  if (!rule) {
    fail(
      `\`${entry.ruleId}\` is not an ESLint core rule in the installed version. The map claims ` +
        'things about core rule ids specifically; a plugin or removed rule id is not one.',
    );
  }
  if (rule.meta?.deprecated) {
    fail(`\`${entry.ruleId}\` is deprecated in the installed ESLint. A deprecated row stops firing silently.`);
  }
  const described = rule.meta?.docs?.description;
  if (described !== entry.eslintDescription) {
    fail(
      `\`${entry.ruleId}\` is documented as "${described}" but the map records ` +
        `"${entry.eslintDescription}". The rationale argues from the rule's documented behaviour, ` +
        'so a changed description means the argument has to be re-read, not the string re-synced.',
    );
  }
}

// --- duplicate rule ids would make the lookup order-dependent ---------------
const seen = new Set();
for (const entry of entries) {
  if (seen.has(entry.ruleId)) fail(`\`${entry.ruleId}\` appears twice. One rule id, one claim.`);
  seen.add(entry.ruleId);
}

const header = existsSync(TARGET)
  ? readFileSync(TARGET, 'utf8').split('export const')[0]
  : `/**\n * GENERATED from src/rulesets/standards/eslint-cwe-map.json — do not edit by hand.\n * Regenerate: node .harness/scripts/generate-eslint-cwe-map.mjs\n */\n`;

const payload = {
  provenance: raw.provenance,
  entries: entries.map((e) => ({
    ruleId: e.ruleId,
    cwe: e.cwe,
    cweName: e.cweName,
    confidence: e.confidence,
  })),
  thresholdDependent: raw.thresholdDependent?.ruleIds ?? [],
};

writeFileSync(TARGET, `${header}export const ESLINT_CWE_MAP = ${JSON.stringify(payload, null, 2)} as const;\n`);

const distinct = new Set(entries.map((e) => Number(e.cwe)));
console.log(
  `✓ generate-eslint-cwe-map: ${entries.length} rule(s) → ${distinct.size} distinct CWE(s), ` +
    `each one named by ISO/IEC 5055 and each rule id verified against the installed ESLint.`,
);
