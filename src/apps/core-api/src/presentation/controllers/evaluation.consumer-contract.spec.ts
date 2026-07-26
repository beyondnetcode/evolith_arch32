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
  EVALUATE_INLINE_PASS_REQUEST,
  TRACKER_BOUND_RESULT_KEYS,
  checkTrackerEvaluationContract,
  trackerDecisionFrom,
  type TrackerBoundEvaluationResult,
} from '@beyondnet/evolith-contracts';
import type { EvaluationContextDto } from '../dtos/evaluation.dto';
import { makeEvaluationOrchestratorFactory } from '../../application/evaluation/evaluation-orchestrator.factory';

const CORE_PATH = '/core';
const SATELLITE_ROOT = '/inmem/satellite';

/** Fake real disk: the Core corpus does not exist, and touching the satellite is a leak. */
function makeFallback(): IFileSystem & { satelliteReads: string[]; writes: string[] } {
  const satelliteReads: string[] = [];
  const writes: string[] = [];
  const guardSat = (p: string) => {
    if (p.startsWith(SATELLITE_ROOT)) satelliteReads.push(p);
  };
  const enoent = () => Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  return {
    satelliteReads,
    writes,
    async readFile(p: string) { guardSat(p); throw enoent(); },
    async readFileBuffer(p: string) { guardSat(p); throw enoent(); },
    async writeFile(p: string) { writes.push(p); },
    async exists(p: string) { guardSat(p); return false; },
    existsSync(p: string) { guardSat(p); return false; },
    async readJson<T>(p: string): Promise<T> { guardSat(p); throw enoent(); },
    async writeJson(p: string) { writes.push(p); },
    async mkdir() { /* noop */ },
    async readdir(p: string): Promise<DirEntry[]> { guardSat(p); return []; },
    async readdirNames(p: string) { guardSat(p); return []; },
    async copy() { /* noop */ },
    async ensureDir() { /* noop */ },
    async ensureFile() { /* noop */ },
    async stat(p: string) { guardSat(p); return { isDirectory: () => false, isFile: () => false }; },
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

async function evaluateInline(request: unknown): Promise<{
  envelope: any;
  data: TrackerBoundEvaluationResult;
  fallback: ReturnType<typeof makeFallback>;
}> {
  const fallback = makeFallback();
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
});
