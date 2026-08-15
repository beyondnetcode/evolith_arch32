/**
 * GT-693 AC5 — `ADR-0041` parity, on the axis this gap broke.
 *
 * The gap was not that OPA disagreed with the native engine about a fact. It was
 * that OPA's answer never arrived: a gate referencing `version-pinning.rego`
 * produced `DEP-01` inside the wasm, no rule claimed the violation, and the
 * evaluator returned `passed`. The two engines were therefore in silent
 * disagreement about the same repository, and the disagreement read as agreement
 * because one side reported conformance.
 *
 * `DEP-01` is the right rule to prove it on: it exists in BOTH corpora — natively
 * in `src/rulesets/sdlc/dependency-pinning.rules.json` with a handler in
 * `dependency-rule.handler.ts`, and in Rego in `version-pinning.rego`.
 *
 * This spec uses the REAL compiled bundle and a REAL directory, because the defect
 * lived in the hop between the wasm's output and the verdict — a mocked wasm cannot
 * exercise the thing that was broken. CI compiles `policy.wasm` in this job before
 * running these tests ("Compile OPA policy to WASM", ci-cd.yml), and the bundle's
 * absence FAILS the suite rather than skipping it: a parity test that quietly does
 * not run is the exact failure mode this row exists to close.
 */

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { OpaEvaluator } from './opa-evaluator';
import { DependencyRuleHandler } from './handlers/dependency-rule.handler';
import type { NormalizedRule } from '../../../domain/models/normalized-rule';

const CORE = path.resolve(__dirname, '../../../../../../..');
const WASM = path.join(CORE, 'src', 'rulesets', 'opa', 'policy.wasm');

const realFs: any = {
  exists: async (p: string) => existsSync(p),
  existsSync: (p: string) => existsSync(p),
  readFile: async (p: string) => readFile(p, 'utf8'),
  readFileBuffer: async (p: string) => readFile(p),
  readJson: async (p: string) => JSON.parse(await readFile(p, 'utf8')),
  readdirNames: async (p: string) => (await import('node:fs/promises')).readdir(p),
  isDirectory: async (p: string) => (await import('node:fs/promises')).stat(p).then((s) => s.isDirectory()).catch(() => false),
  isDir: async (p: string) => (await import('node:fs/promises')).stat(p).then((s) => s.isDirectory()).catch(() => false),
  stat: async (p: string) => {
    const s = await (await import('node:fs/promises')).stat(p);
    return { isDirectory: () => s.isDirectory(), isFile: () => s.isFile(), size: s.size };
  },
  readdir: async (p: string) => (await import('node:fs/promises')).readdir(p),
  listFiles: async (p: string) => (await import('node:fs/promises')).readdir(p),
};

const silentLogger: any = {
  info: () => undefined, warn: () => undefined, error: () => undefined,
  debug: () => undefined, success: () => undefined,
};

/** The satellite both engines are asked about: one caret-pinned dependency. */
function satelliteViolatingDep01(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gt693-parity-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'sat', version: '1.0.0', dependencies: { lodash: '^4.17.21' } }, null, 2),
  );
  writeFileSync(path.join(dir, 'evolith.yaml'), 'apiVersion: evolith.dev/v1\nkind: Satellite\nmetadata:\n  name: sat\nspec: {}\n');
  return dir;
}

/** `DEP-01` exactly as the shipped native corpus declares it. */
function nativeDep01(): NormalizedRule {
  const corpus = JSON.parse(
    readFileSync(path.join(CORE, 'src', 'rulesets', 'sdlc', 'dependency-pinning.rules.json'), 'utf8'),
  ) as { rules: NormalizedRule[] };
  const rule = corpus.rules.find((r) => r.id === 'DEP-01');
  if (!rule) throw new Error('DEP-01 is not in the shipped corpus — this parity test is measuring nothing');
  return rule;
}

/** The gate rule a satellite writes to pull in the Rego policy. */
const opaGateRule: NormalizedRule = {
  id: 'opa-version-pinning',
  severity: 'MUST',
  category: 'version-pinning',
  title: 'Dependency pinning (Rego)',
  description: 'gate rule referencing rulesets/opa/version-pinning.rego',
  blocking: true,
  sourceFile: 'gate.json',
} as NormalizedRule;

describe('ADR-0041 parity across the attribution seam · GT-693 AC5', () => {
  let satellite: string;

  beforeAll(() => {
    satellite = satelliteViolatingDep01();
  });

  it('the compiled bundle is present — this suite must not pass by not running', () => {
    expect([WASM, existsSync(WASM)]).toEqual([WASM, true]);
  });

  it('BOTH engines fail the same repository on the same rule', async () => {
    const native = await new DependencyRuleHandler(realFs).evaluate(nativeDep01(), {
      satellitePath: satellite,
      corePath: CORE,
    } as any);

    const [opa] = await new OpaEvaluator(realFs, silentLogger).evaluateAll([opaGateRule], {
      satellitePath: satellite,
      corePath: CORE,
    } as any);

    expect(native.result).toBe('failed');
    // Before GT-693 this read `passed` while the wasm had already produced DEP-01.
    expect(opa.result).toBe('failed');
    // …and it is the SAME finding, not merely the same verdict.
    expect(opa.message).toMatch(/lodash/);
    expect(opa.message).toMatch(/\^4\.17\.21/);
  }, 60000);

  it('and both PASS a repository that pins exactly, so the agreement is not vacuous', async () => {
    const clean = mkdtempSync(path.join(os.tmpdir(), 'gt693-parity-clean-'));
    writeFileSync(
      path.join(clean, 'package.json'),
      JSON.stringify({ name: 'sat', version: '1.0.0', dependencies: { lodash: '4.17.21' } }, null, 2),
    );
    writeFileSync(path.join(clean, 'evolith.yaml'), 'apiVersion: evolith.dev/v1\nkind: Satellite\nmetadata:\n  name: sat\nspec: {}\n');

    const native = await new DependencyRuleHandler(realFs).evaluate(nativeDep01(), {
      satellitePath: clean,
      corePath: CORE,
    } as any);
    const [opa] = await new OpaEvaluator(realFs, silentLogger).evaluateAll([opaGateRule], {
      satellitePath: clean,
      corePath: CORE,
    } as any);

    expect(native.result).toBe('passed');
    expect(opa.result).toBe('passed');
  }, 60000);
});
