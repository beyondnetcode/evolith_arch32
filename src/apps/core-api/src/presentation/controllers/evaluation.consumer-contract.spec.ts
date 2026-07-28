/**
 * GT-573 — CONSUMER-DRIVEN contract test for `POST /api/v1/evaluate`.
 *
 * The Tracker binds `overallVerdict / outcome / results.gate[] / evaluatedAt`.
 * The inline (`evaluationInput.files`) branch used to answer with the legacy
 * `{ topology, gates, summary }` envelope instead, so every one of those fields
 * was absent, the consumer's `Passed` stayed null, and its decision mapper fell
 * through to `SKIPPED` — writing a "not applicable" gate-ledger row over a real
 * architectural FAIL. Both CIs were green: nothing on either side asserted the
 * boundary.
 *
 * This spec is that assertion, driven from the consumer's own expectations as
 * published in `@beyondnet/evolith-contracts` (`checkTrackerEvaluationContract`
 * / `trackerDecisionFrom`, a faithful port of `CoreEvaluationGateway`). The
 * FAILING case is the one that matters: it proves a FAIL is representable and
 * distinguishable from "not evaluated".
 *
 * It runs the REAL inline branch — real OverlayFileSystem, real
 * RulesetValidatorService, real ValidateSatelliteUseCase, real
 * EvaluationOrchestrator — against an in-memory satellite, with a fake disk that
 * records any read of the satellite subtree (there must be none).
 */

import { EvaluationController } from './evaluation.controller';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { EvaluationOrchestrator } from '@beyondnet/evolith-core-domain/evaluation';
import type { DirEntry, IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  EVALUATE_INLINE_FAIL_REQUEST,
  EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST,
  EVALUATE_INLINE_PASS_REQUEST,
  EVALUATION_RESULT_FAIL_FIXTURE,
  EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE,
  EVALUATION_RESULT_PASS_FIXTURE,
  TRACKER_BOUND_RESULT_KEYS,
  assertFixtureCongruence,
  checkFixtureCongruence,
  checkTrackerEvaluationContract,
  trackerDecisionFrom,
  type TrackerBoundEvaluationResult,
} from '@beyondnet/evolith-contracts';
import type { EvaluationContextDto } from '../dtos/evaluation.dto';
import { makeEvaluationOrchestratorFactory } from '../../application/evaluation/evaluation-orchestrator.factory';

const CORE_PATH = '/core';
const SATELLITE_ROOT = '/inmem/satellite';

/**
 * Fake real disk: the satellite is a leak if touched, and the Core corpus is
 * whatever `coreFiles` says it is (empty by default, so the general-rulesets
 * path is the only one that can fire).
 */
function makeFallback(
  coreFiles: Record<string, string> = {},
): IFileSystem & { satelliteReads: string[]; writes: string[] } {
  const satelliteReads: string[] = [];
  const writes: string[] = [];
  const guardSat = (p: string) => {
    if (p.startsWith(SATELLITE_ROOT)) satelliteReads.push(p);
  };
  const enoent = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  const isFile = (p: string) => Object.prototype.hasOwnProperty.call(coreFiles, p);
  const isDir = (p: string) => Object.keys(coreFiles).some((k) => k.startsWith(`${p}/`));
  const has = (p: string) => isFile(p) || isDir(p);
  const childrenOf = (p: string): string[] => {
    const prefix = `${p}/`;
    const names = new Set<string>();
    for (const key of Object.keys(coreFiles)) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf('/');
      names.add(slash === -1 ? rest : rest.slice(0, slash));
    }
    return [...names];
  };
  return {
    satelliteReads,
    writes,
    async readFile(p: string) { guardSat(p); if (isFile(p)) return coreFiles[p]; throw enoent(); },
    async readFileBuffer(p: string) { guardSat(p); if (isFile(p)) return Buffer.from(coreFiles[p], 'utf-8'); throw enoent(); },
    async writeFile(p: string) { writes.push(p); },
    async exists(p: string) { guardSat(p); return has(p); },
    existsSync(p: string) { guardSat(p); return has(p); },
    async readJson<T>(p: string): Promise<T> { guardSat(p); if (isFile(p)) return JSON.parse(coreFiles[p]) as T; throw enoent(); },
    async writeJson(p: string) { writes.push(p); },
    async mkdir() { /* noop */ },
    async readdir(p: string): Promise<DirEntry[]> {
      guardSat(p);
      return childrenOf(p).map((name) => ({
        name,
        isDirectory: () => isDir(`${p}/${name}`),
        isFile: () => isFile(`${p}/${name}`),
      }));
    },
    async readdirNames(p: string) { guardSat(p); return childrenOf(p); },
    async copy() { /* noop */ },
    async ensureDir() { /* noop */ },
    async ensureFile() { /* noop */ },
    async stat(p: string) { guardSat(p); return { isDirectory: () => isDir(p), isFile: () => isFile(p) }; },
    async remove() { /* noop */ },
  };
}

const logger = { info() {}, warn() {}, error() {}, debug() {} };
const configParser = {
  parse: <T,>(content: string): T => JSON.parse(content) as T,
  stringify: (data: unknown) => JSON.stringify(data),
};
const rulesetRepo = { getRuleset: async () => null, listRulesets: async () => [] } as any;
const workspaceResolver = { corePath: () => CORE_PATH } as any;

function buildController(fallback: IFileSystem) {
  return new EvaluationController(
    // The singleton orchestrator belongs to the workspaceRef branch; the inline
    // branch must never reach it.
    { evaluate: jest.fn() } as unknown as EvaluationOrchestrator,
    { execute: jest.fn() } as unknown as ValidateSatelliteUseCase,
    fallback,
    logger as any,
    configParser as any,
    rulesetRepo,
    undefined,
    workspaceResolver,
    undefined,
    // The SAME factory app.module.ts registers (no kind evaluators wired here).
    makeEvaluationOrchestratorFactory([]),
  );
}

async function evaluateInline(
  request: unknown,
  coreFiles: Record<string, string> = {},
): Promise<{
  envelope: any;
  data: TrackerBoundEvaluationResult;
  fallback: ReturnType<typeof makeFallback>;
}> {
  const fallback = makeFallback(coreFiles);
  const controller = buildController(fallback);
  const envelope = (await controller.evaluate(request as EvaluationContextDto)) as any;
  // The consumer unwraps `data` from the ADR-0073 envelope before binding.
  return { envelope, data: envelope.data as TrackerBoundEvaluationResult, fallback };
}

describe('POST /api/v1/evaluate — Tracker consumer contract, inline branch (GT-573)', () => {
  it('a PASSING evaluation satisfies every field the consumer binds', async () => {
    const { envelope, data, fallback } = await evaluateInline(EVALUATE_INLINE_PASS_REQUEST);

    expect(envelope.success).toBe(true);
    expect(envelope.meta.command).toBe('evolith evaluate');

    for (const key of TRACKER_BOUND_RESULT_KEYS) {
      expect(data).toHaveProperty(key);
    }
    expect(checkTrackerEvaluationContract(data)).toEqual({ ok: true, missing: [] });
    expect(data.overallVerdict).toBe('PASS');
    expect(data.outcome).toBe('approved');
    expect(trackerDecisionFrom(data)).toBe('PASSED');

    // Stateless: the satellite came from memory and nothing was written.
    expect(fallback.satelliteReads).toHaveLength(0);
    expect(fallback.writes).toHaveLength(0);
  });

  it('a FAILING evaluation is recorded as FAILED — never SKIPPED (the incident)', async () => {
    const { data, fallback } = await evaluateInline(EVALUATE_INLINE_FAIL_REQUEST);

    expect(checkTrackerEvaluationContract(data)).toEqual({ ok: true, missing: [] });

    // The verdict is a real FAIL, not an absence of one.
    expect(data.overallVerdict).toBe('FAIL');
    expect(data.outcome).toBe('rejected');
    expect(data.evaluatedAt).toEqual(expect.any(String));

    // …and it is carried in the sub-result the consumer reads.
    const gates = data.results?.gate ?? [];
    expect(gates.length).toBeGreaterThan(0);
    expect(gates.some((g) => String(g.verdict).toUpperCase() === 'FAIL')).toBe(true);
    const failing = gates.find((g) => String(g.verdict).toUpperCase() === 'FAIL')!;
    expect(failing.gateId).toEqual(expect.any(String));
    expect(failing.gaps?.length).toBeGreaterThan(0);
    expect(failing.gaps![0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        severity: expect.any(String),
        message: expect.any(String),
      }),
    );

    // The oracle: what the Tracker would persist in its gate ledger.
    expect(trackerDecisionFrom(data)).toBe('FAILED');
    expect(trackerDecisionFrom(data)).not.toBe('SKIPPED');

    expect(fallback.satelliteReads).toHaveLength(0);
  });

  it('emits ONE shape: the inline response is the canonical result, not the legacy envelope', async () => {
    const { data } = await evaluateInline(EVALUATE_INLINE_FAIL_REQUEST);

    // Canonical markers present…
    expect(data).toHaveProperty('schemaVersion');
    expect(data).toHaveProperty('versions');
    expect(data).toHaveProperty('rationale');
    // …and the legacy `{ topology, gates, summary }` envelope gone for good.
    expect(data).not.toHaveProperty('topology');
    expect(data).not.toHaveProperty('gates');
    expect(data).not.toHaveProperty('summary');
  });

  it('does not delegate to the workspaceRef orchestrator', async () => {
    const fallback = makeFallback();
    const controller = buildController(fallback);
    const singleton = (controller as unknown as { orchestrator: { evaluate: jest.Mock } }).orchestrator;

    await controller.evaluate(EVALUATE_INLINE_PASS_REQUEST as unknown as EvaluationContextDto);

    expect(singleton.evaluate).not.toHaveBeenCalled();
  });

  it('the PASS and governance-FAIL fixtures published to consumers still match what the Core emits', async () => {
    const pass = await evaluateInline(EVALUATE_INLINE_PASS_REQUEST);
    expect(checkFixtureCongruence(pass.data, EVALUATION_RESULT_PASS_FIXTURE)).toEqual({ ok: true, missing: [] });

    const fail = await evaluateInline(EVALUATE_INLINE_FAIL_REQUEST);
    expect(checkFixtureCongruence(fail.data, EVALUATION_RESULT_FAIL_FIXTURE)).toEqual({ ok: true, missing: [] });
  });
});

// ---------------------------------------------------------------------------
// The OPA policy gate — the half the first round of GT-573 did NOT prove
// ---------------------------------------------------------------------------

/**
 * The Core corpus the OPA-gate case is evaluated against.
 *
 * It is minimal on purpose: one phase, one gate, one required artifact, one
 * `.rego` rule. Everything the pipeline needs to reach `OpaEvaluator` and
 * nothing else, so a FAIL can have exactly one cause.
 */
const OPA_GATE_ID = 'gate-f3-architecture-conformance';
const OPA_RULE_PATH = 'rulesets/opa/architecture-boundaries.rego';
/** `deriveRuleId()` strips the `rulesets/` prefix and the `.rego` suffix, then slugifies. */
const OPA_RULE_ID = 'opa-architecture-boundaries';
const OPA_VIOLATION_MESSAGE = 'ARCH-001: presentation layer imports infrastructure directly';

const OPA_CORE_CORPUS: Record<string, string> = {
  // `phaseId: 'construction'` normalises to the legacy `f3` the on-disk gate data is keyed by.
  [`${CORE_PATH}/reference/governance/sdlc/phases/f3.json`]: JSON.stringify({
    id: 'f3',
    name: 'Construction',
    shortName: 'C',
    order: 3,
    description: 'Construction phase',
    gates: [OPA_GATE_ID],
  }),
  [`${CORE_PATH}/reference/governance/sdlc/gates/${OPA_GATE_ID}.json`]: JSON.stringify({
    id: OPA_GATE_ID,
    name: 'Architecture Conformance',
    phase: 'f3',
    description: 'Layer boundaries must hold',
    requiredArtifacts: [
      {
        artifact: 'docs/architecture.md',
        validation: 'layer boundaries hold',
        rules: [OPA_RULE_PATH],
      },
    ],
    blockingCriteria: [{ criterion: 'architecture', action: 'block' }],
  }),
  [`${CORE_PATH}/${OPA_RULE_PATH}`]: 'package evolith\n',
};

describe('POST /api/v1/evaluate — a genuine OPA policy-gate FAIL round-trips (GT-573)', () => {
  const realFetch = globalThis.fetch;
  const priorOpaUrl = process.env.OPA_URL;
  let opaCalls: unknown[];

  beforeEach(() => {
    opaCalls = [];
    // The REAL OpaEvaluator runs; only its transport is stubbed. `OPA_URL`
    // selects the sidecar branch, which is the deployed topology (the wasm
    // branch needs `rulesets/opa/policy.wasm`, a build artifact that is
    // gitignored here — a test that depended on it would be green locally and
    // red on a clean checkout).
    process.env.OPA_URL = 'http://opa.invalid';
    (globalThis as unknown as { fetch: unknown }).fetch = async (url: unknown, init: unknown) => {
      opaCalls.push({ url, init });
      return {
        ok: true,
        json: async () => ({ result: [{ id: OPA_RULE_ID, message: OPA_VIOLATION_MESSAGE }] }),
      } as unknown as Response;
    };
  });

  afterEach(() => {
    // Restore rather than delete: a runner that legitimately sets OPA_URL must
    // not have it stripped by this suite.
    if (priorOpaUrl === undefined) delete process.env.OPA_URL;
    else process.env.OPA_URL = priorOpaUrl;
    (globalThis as unknown as { fetch: unknown }).fetch = realFetch;
  });

  it('a POLICY violation — not a missing manifest — reaches the ledger as FAILED', async () => {
    const { data, fallback } = await evaluateInline(EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST, OPA_CORE_CORPUS);

    // The policy engine actually ran.
    expect(opaCalls).toHaveLength(1);
    expect(String((opaCalls[0] as { url: string }).url)).toBe('http://opa.invalid/evolith');

    // The satellite is governance-conformant, so this FAIL cannot be GOV-000…
    const gates = data.results?.gate ?? [];
    expect(gates.map((g) => g.gateId)).not.toContain('general-rulesets');
    // …it is the SDLC policy gate, attributed to its phase.
    expect(gates).toHaveLength(1);
    expect(gates[0].gateId).toBe(OPA_GATE_ID);
    expect(gates[0].phaseId).toBe('construction');
    expect(String(gates[0].verdict).toUpperCase()).toBe('FAIL');
    expect(gates[0].gaps?.[0]?.message).toBe(OPA_VIOLATION_MESSAGE);

    // The verdict the consumer binds, and the decision it persists.
    expect(checkTrackerEvaluationContract(data)).toEqual({ ok: true, missing: [] });
    expect(data.overallVerdict).toBe('FAIL');
    expect(trackerDecisionFrom(data)).toBe('FAILED');
    expect(trackerDecisionFrom(data)).not.toBe('SKIPPED');

    // Still stateless.
    expect(fallback.satelliteReads).toHaveLength(0);
    expect(fallback.writes).toHaveLength(0);
  });

  it('attributes the failing rule to the OPA engine over a .rego rule', async () => {
    const { data } = await evaluateInline(EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST, OPA_CORE_CORPUS);

    const rules = (data as { rulesExecuted?: ReadonlyArray<Record<string, unknown>> }).rulesExecuted ?? [];
    expect(rules).toHaveLength(1);
    expect(rules[0].ruleId).toBe(OPA_RULE_ID);
    expect(rules[0].engine).toBe('opa');
    expect(String(rules[0].rulesetRef)).toMatch(/\.rego$/);
    expect(rules[0].verdict).toBe('FAIL');
  });

  it('is the SAME satellite that PASSES when the policy returns no violation — so the FAIL is the policy, not the fixture', async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = async () =>
      ({ ok: true, json: async () => ({ result: [] }) }) as unknown as Response;

    const { data } = await evaluateInline(EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST, OPA_CORE_CORPUS);

    expect(data.overallVerdict).toBe('PASS');
    expect(trackerDecisionFrom(data)).toBe('PASSED');
    // The gate ran and passed — this is not the "nothing was evaluated" case.
    expect(data.results?.gate?.[0]?.gateId).toBe(OPA_GATE_ID);
  });

  it('the OPA-gate fixture published to consumers matches what the Core emits', async () => {
    const { data } = await evaluateInline(EVALUATE_INLINE_OPA_GATE_FAIL_REQUEST, OPA_CORE_CORPUS);

    expect(checkFixtureCongruence(data, EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE)).toEqual({
      ok: true,
      missing: [],
    });
    expect(() => assertFixtureCongruence(data, EVALUATION_RESULT_OPA_GATE_FAIL_FIXTURE)).not.toThrow();
  });
});
