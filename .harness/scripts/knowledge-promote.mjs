#!/usr/bin/env node
/**
 * @file knowledge-promote.mjs
 * @description Promote a KI candidate through the intake state machine.
 *
 * Legal transitions:
 *   candidate → evaluated → accepted → executable → retired
 *   (any status) → retired
 *
 * Usage:
 *   node .harness/scripts/knowledge-promote.mjs <ki-file> <target-status>
 *
 * The script:
 *   1. Reads and parses the YAML KI file
 *   2. Validates the transition is legal
 *   3. Updates promotion.status and promotion.promoted_at/promoted_by
 *   4. Validates the updated file against schema + OPA
 *   5. Writes the updated file and outputs the result
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ensureOpa } from './opa-runtime.mjs';

const ROOT = process.cwd();
const KI_SCHEMA = 'src/rulesets/schema/knowledge-intake.schema.json';
const OPA_POLICY = 'src/rulesets/opa/knowledge-intake.rego';

const VALID_TRANSITIONS = {
  candidate: ['evaluated', 'retired'],
  evaluated: ['accepted', 'retired'],
  accepted: ['executable', 'retired'],
  executable: ['retired'],
  retired: [],
};

const VALID_STATUSES = ['candidate', 'evaluated', 'accepted', 'executable', 'retired'];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function loadKiFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`KI file not found: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return { doc: yaml.load(content), content };
  } catch (error) {
    fail(`Invalid YAML in ${filePath}: ${error.message}`);
  }
}

function validateTransition(currentStatus, targetStatus) {
  if (!VALID_STATUSES.includes(targetStatus)) {
    fail(`Invalid target status "${targetStatus}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (currentStatus === targetStatus) {
    fail(`KI is already in status "${targetStatus}". No transition needed.`);
  }
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    fail(`Illegal transition: ${currentStatus} → ${targetStatus}. Allowed from "${currentStatus}": ${allowed.join(', ') || '(none)'}`);
  }
}

function validateRequiredFields(targetStatus, doc) {
  if (targetStatus !== 'candidate') {
    if (!doc.promotion) fail('Missing promotion section');
  }
  if (targetStatus === 'accepted' || targetStatus === 'executable') {
    if (!doc.promotion?.adr) fail(`Transition to "${targetStatus}" requires a non-null ADR reference (promotion.adr)`);
  }
  if (targetStatus === 'executable') {
    if (!doc.promotion?.native_rule) fail('Transition to "executable" requires promotion.native_rule');
    if (!doc.promotion?.opa_policy) fail('Transition to "executable" requires promotion.opa_policy');
    if (!doc.promotion?.fixtures?.length) fail('Transition to "executable" requires at least one fixture');
  }
  if (targetStatus === 'retired') {
    if (!doc.promotion?.disposition) fail('Transition to "retired" requires a non-null disposition reason');
  }
}

function validateWithSchema(filePath) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemaPath = path.join(ROOT, KI_SCHEMA);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);
  const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));

  if (!validate(doc)) {
    const errors = ajv.errorsText(validate.errors, { separator: '; ' });
    fail(`Schema validation failed after promotion:\n  ${errors}`);
  }
  success('Schema validation passed');
}

async function validateWithOpa(filePath) {
  const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
  const inputJson = JSON.stringify(doc);

  try {
    const opa = await ensureOpa(ROOT);
    execFileSync(opa.binary, [
      'eval',
      '--data', OPA_POLICY,
      '--format=json',
      '--input', '/dev/stdin',
      'data.evolith.knowledge_intake.violations',
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      input: inputJson,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
    success('OPA policy evaluation passed');
  } catch (error) {
    fail(`OPA policy evaluation failed:\n  ${error.stderr || error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node .harness/scripts/knowledge-promote.mjs <ki-file> <target-status>');
    console.error('');
    console.error('Legal transitions:');
    console.error('  candidate  → evaluated, retired');
    console.error('  evaluated  → accepted, retired');
    console.error('  accepted   → executable, retired');
    console.error('  executable → retired');
    console.error('  retired    → (no transitions)');
    process.exit(1);
  }

  const [kiFileArg, targetStatus] = args;
  const kiFilePath = path.resolve(ROOT, kiFileArg);

  console.log(`\n📋 Knowledge Intake Promotion`);
  console.log(`   File: ${kiFileArg}`);
  console.log(`   Target: ${targetStatus}`);

  const { doc } = loadKiFile(kiFilePath);
  const currentStatus = doc.promotion?.status || 'candidate';
  console.log(`   Current: ${currentStatus}`);

  validateTransition(currentStatus, targetStatus);
  validateRequiredFields(targetStatus, doc);

  const now = new Date().toISOString().split('T')[0];
  doc.promotion.status = targetStatus;
  doc.promotion.promoted_at = now;
  if (!doc.promotion.promoted_by) {
    doc.promotion.promoted_by = 'knowledge-promote.mjs';
  }

  const updatedYaml = yaml.dump(doc, { lineWidth: -1, quotingType: '"' });
  fs.writeFileSync(kiFilePath, updatedYaml, 'utf8');
  success(`Updated ${kiFileArg}: ${currentStatus} → ${targetStatus} (promoted_at: ${now})`);

  validateWithSchema(kiFilePath);
  await validateWithOpa(kiFilePath);

  console.log(`\n🎉 Promotion complete: ${kiFileArg} is now "${targetStatus}"`);
}

main().catch((error) => {
  fail(error.message);
});
