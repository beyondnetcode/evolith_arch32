#!/usr/bin/env node
/**
 * @file 18-validate-knowledge-parity.mjs
 * @description CI Step: Differential gate for knowledge intake — shared fixtures
 *   run through both Native (JSON Schema) and OPA (Rego) engines; fails on
 *   verdict, rule-ID, severity, or evidence drift (GT-154).
 *
 * Fixture shape (in reference/knowledge/intake/parity-fixtures/):
 *   { "input": {…candidate fields…}, "expectedNative": [ { ruleId, severity, message } ] }
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parityReport, contentVersion } from './parity-gate.mjs';
import { ensureOpa } from '../opa-runtime.mjs';

const ROOT = process.cwd();
const INTAKE_DIR = 'reference/knowledge/intake';
const KI_SCHEMA = 'rulesets/schema/knowledge-intake.schema.json';
const OPA_POLICY = 'rulesets/opa/knowledge-intake.rego';
const FIXTURES_DIR = `${INTAKE_DIR}/parity-fixtures`;

/**
 * Validate a candidate against the JSON Schema (Native evaluator).
 * Returns an array of decision-like objects extracted from AJV errors.
 */
function nativeDecisions(candidate, validate) {
  validate(candidate);
  if (!validate.errors || validate.errors.length === 0) return [];
  return validate.errors.map((e) => ({
    ruleId: 'KI-R00',
    severity: 'error',
    message: `${e.instancePath || '/'} ${e.message}`,
    file: null,
  }));
}

/**
 * Evaluate a candidate through the OPA Rego policy using the host opa binary.
 * Returns normalized decisions.
 */
function opaDecisions(candidate, opaBinary) {
  const inputJson = JSON.stringify(candidate);
  const args = ['eval', '--data', OPA_POLICY, '--format=json', '--input', '/dev/stdin', 'data.evolith.knowledge_intake.violations'];
  let stdout;
  try {
    stdout = execFileSync(opaBinary, args, { cwd: ROOT, encoding: 'utf8', input: inputJson, stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
  } catch (e) {
    throw new Error(`OPA eval failed: ${e.stderr || e.message}`);
  }
  const parsed = JSON.parse(stdout);
  const items = parsed?.result ? (Array.isArray(parsed.result) ? parsed.result[0]?.expressions?.[0]?.value : []) : [];
  if (!Array.isArray(items)) return [];
  return items.map((v) => ({
    ruleId: v.id ?? null,
    severity: 'error',
    message: v.message ?? '',
    file: null,
  }));
}

export async function validateKnowledgeParity(root = ROOT) {
  const errors = [];
  const reports = [];
  const fixturesDir = resolve(root, FIXTURES_DIR);
  const kiSchemaPath = resolve(root, KI_SCHEMA);

  if (!existsSync(fixturesDir)) {
    return { reports: [], errors: [`${FIXTURES_DIR} does not exist`] };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(kiSchemaPath, 'utf8')));

  const opaBinary = (await ensureOpa(root)).binary;

  const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

  if (!fixtureFiles.length) {
    errors.push(`${FIXTURES_DIR} contains no JSON fixtures`);
    return { reports: [], errors };
  }

  let totalDurationMs = 0;
  let drifting = 0;

  for (const file of fixtureFiles) {
    const fixturePath = resolve(fixturesDir, file);
    let report;
    try {
      const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
      const start = process.hrtime.bigint();
      const native = nativeDecisions(fixture.input || {}, validate);
      const opa = opaDecisions(fixture.input || {}, opaBinary);
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      totalDurationMs += durationMs;
      report = parityReport({
        topology: 'knowledge-intake',
        fixture: file,
        nativeDecisions: fixture.expectedNative || native,
        opaDecisions: opa,
        versions: {
          policy: contentVersion(readFileSync(resolve(root, OPA_POLICY), 'utf8')),
          schema: contentVersion(readFileSync(kiSchemaPath, 'utf8')),
        },
        durationMs,
      });
    } catch (e) {
      report = { topology: 'knowledge-intake', fixture: file, parity: false, error: String(e.message) };
    }
    reports.push(report);
    if (!report.parity) drifting += 1;
  }

  const out = {
    schemaVersion: '1.0',
    evaluated: reports.length,
    drifting,
    telemetry: { totalDurationMs },
    reports,
  };

  if (drifting > 0) {
    for (const r of reports) {
      if (!r.parity) {
        const detail = r.drift ? r.drift.map((d) => `  - ${d.ruleId || '(verdict)'}: ${d.title}`).join('\n') : `  error: ${r.error}`;
        errors.push(`${FIXTURES_DIR}/${r.fixture} parity drift:\n${detail}`);
      }
    }
  }

  return { reports, errors, out };
}

async function run() {
  console.log('🔬 Knowledge Intake Parity Gate (GT-154)');
  const result = await validateKnowledgeParity();
  if (result.errors.length) {
    console.error(`❌ Knowledge parity validation failed:\n- ${result.errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`   ${result.reports.length} fixture(s) evaluated; 0 drift/failure(s).`);
  console.log(`PARITY ${JSON.stringify(result.out)}`);
  console.log('✅ Knowledge intake parity gate passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
