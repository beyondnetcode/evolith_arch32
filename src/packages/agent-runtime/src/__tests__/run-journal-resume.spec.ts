/**
 * GT-593 — a run killed mid-pipeline resumes from the journal.
 *
 * The gap: `grep -rniE "resume|journal"` over this package returned ZERO, so a
 * `kill -9` lost the work AND lost the account of what the non-deterministic
 * steps had actually returned. These tests simulate the kill by throwing from a
 * downstream port and then re-submitting the same correlated request, and assert
 * the upstream steps are REPLAYED rather than re-rolled.
 *
 * The negative assertions matter as much: what is not resumable must stay not
 * resumable, and must be visibly so.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createAgentRuntime } from '../bootstrap';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { InMemoryRunJournalAdapter } from '../adapters/journal/in-memory-run-journal.adapter';
import { FileRunJournalAdapter } from '../adapters/journal/file-run-journal.adapter';
import { JournaledRun, hashJournalValue } from '../application/run-journal';
import { InMemoryKnowledgeAdapter } from '../adapters/knowledge/in-memory-knowledge.adapter';
import { StubCoreEvaluationAdapter } from '../adapters/core/stub-core-evaluation.adapter';
import { PendingApprovalAdapter } from '../adapters/approval/pending-approval.adapter';
import type { IHarnessPort, HarnessExecutionResult } from '../domain/ports/harness.port';
import type { ICoreEvaluationPort } from '../domain/ports/core-evaluation.port';
import type { IRunJournalPort } from '../domain/ports/run-journal.port';
import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation/contracts';

const FIXED_NOW = '2026-07-28T00:00:00.000Z';

function request(correlationId?: string) {
  return parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_tracker',
    initiative: 'init_001',
    phase: 'discovery',
    gate: 'prd_readiness',
    intent: 'validate_discovery_gate',
    tool: 'validate-discovery-gate',
    ...(correlationId ? { correlation_id: correlationId } : {}),
    parameters: { requiredArtifacts: ['prd'], presentArtifacts: ['prd'], gate: 'prd_readiness' },
  });
}

/**
 * A harness whose answer CHANGES between calls — standing in for any
 * non-deterministic step. If a resume re-runs it, the second answer differs and
 * the test can see it.
 */
function driftingHarness(): { port: IHarnessPort; calls: number } {
  const state = { calls: 0 };
  const port: IHarnessPort = {
    discover: async () => [],
    describe: async () => undefined,
    execute: async (req): Promise<HarnessExecutionResult> => {
      state.calls += 1;
      return {
        ok: true,
        capability: req.capability,
        data: { status: 'passed', roll: `answer-${state.calls}`, missing_artifacts: [] },
      };
    },
  };
  return {
    port,
    get calls() {
      return state.calls;
    },
  };
}

/**
 * The real stub Core, wrapped so the FIRST call throws — the `kill -9` stand-in
 * for a step downstream of the ones already journaled. Wrapping the real adapter
 * (rather than hand-rolling an EvaluationResult) keeps the assertions honest: the
 * resumed run assembles from a genuine Core result.
 */
function coreThatFailsOnce(): { port: ICoreEvaluationPort; calls: number } {
  const state = { calls: 0 };
  const real = new StubCoreEvaluationAdapter();
  const port: ICoreEvaluationPort = {
    evaluate: async (ctx): Promise<EvaluationResult> => {
      state.calls += 1;
      if (state.calls === 1) throw new Error('process killed mid-pipeline');
      return real.evaluate(ctx);
    },
  };
  return {
    port,
    get calls() {
      return state.calls;
    },
  };
}

describe('JournaledRun (GT-593)', () => {
  const journalOf = (entries: unknown[] = []): IRunJournalPort => {
    const log = [...(entries as never[])];
    return {
      read: async () => log,
      append: async (e) => {
        log.push(e as never);
      },
    };
  };

  it('records a step it ran, and REPLAYS it on the next attempt', async () => {
    const journal = new InMemoryRunJournalAdapter();
    let executions = 0;
    const execute = async () => {
      executions += 1;
      return { roll: executions };
    };

    const first = await JournaledRun.open(journal, 'run-1', () => FIXED_NOW);
    const a = await first.step('engine-plan', { q: 1 }, execute);
    expect(a).toEqual({ value: { roll: 1 }, resumed: false });

    const second = await JournaledRun.open(journal, 'run-1', () => FIXED_NOW);
    const b = await second.step('engine-plan', { q: 1 }, execute);

    expect(b.resumed).toBe(true);
    expect(b.value).toEqual({ roll: 1 }); // the ORIGINAL answer, not a re-roll
    expect(executions).toBe(1);
    expect(second.resumedSteps).toEqual(['engine-plan']);
    expect(second.recordedSteps).toEqual([]);
  });

  it('a DIFFERENT input is a different question and is executed for real', async () => {
    const journal = new InMemoryRunJournalAdapter();
    let executions = 0;
    const execute = async () => ({ roll: ++executions });

    await (await JournaledRun.open(journal, 'run-1')).step('ground', { q: 1 }, execute);
    const next = await JournaledRun.open(journal, 'run-1');
    const b = await next.step('ground', { q: 2 }, execute);

    expect(b.resumed).toBe(false);
    expect(executions).toBe(2);
  });

  it('matches entries in order and consumes each once (a step run twice resumes twice)', async () => {
    const journal = new InMemoryRunJournalAdapter();
    let executions = 0;
    const execute = async () => ({ roll: ++executions });

    const first = await JournaledRun.open(journal, 'run-1');
    await first.step('harness-execute', { q: 1 }, execute);
    await first.step('harness-execute', { q: 1 }, execute);
    expect(executions).toBe(2);

    const second = await JournaledRun.open(journal, 'run-1');
    const a = await second.step('harness-execute', { q: 1 }, execute);
    const b = await second.step('harness-execute', { q: 1 }, execute);

    expect([a.value, b.value]).toEqual([{ roll: 1 }, { roll: 2 }]);
    expect(executions).toBe(2); // nothing re-executed
  });

  it('hashes inputs stably regardless of key order, and distinguishes different values', () => {
    expect(hashJournalValue({ a: 1, b: [2, { c: 3 }] })).toBe(
      hashJournalValue({ b: [2, { c: 3 }], a: 1 }),
    );
    expect(hashJournalValue({ a: 1 })).not.toBe(hashJournalValue({ a: 2 }));
  });

  it('a journal that cannot be READ degrades to a fresh run instead of failing it', async () => {
    const broken: IRunJournalPort = {
      read: async () => {
        throw new Error('disk gone');
      },
      append: async () => undefined,
    };
    const run = await JournaledRun.open(broken, 'run-1');
    expect(run.priorEntries).toBe(0);
    const out = await run.step('ground', { q: 1 }, async () => 'fresh');
    expect(out).toEqual({ value: 'fresh', resumed: false });
  });

  it('a journal that cannot be WRITTEN degrades the audit, never the run', async () => {
    const broken: IRunJournalPort = {
      read: async () => [],
      append: async () => {
        throw new Error('disk full');
      },
    };
    const run = await JournaledRun.open(broken, 'run-1');
    await expect(run.step('ground', { q: 1 }, async () => 'value')).resolves.toEqual({
      value: 'value',
      resumed: false,
    });
  });

  it('ignores an unrelated run id', async () => {
    const journal = journalOf();
    await (await JournaledRun.open(journal, 'run-a')).step('ground', { q: 1 }, async () => 1);
    const other = await JournaledRun.open(new InMemoryRunJournalAdapter(), 'run-b');
    expect(other.priorEntries).toBe(0);
  });
});

describe('FileRunJournalAdapter (durable across a process death)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'evolith-journal-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('survives a FRESH adapter instance on the same directory', async () => {
    await new FileRunJournalAdapter({ directory: dir }).append({
      runId: 'corr-1',
      step: 'harness-execute',
      at: FIXED_NOW,
      inputHash: 'a'.repeat(64),
      outputHash: 'b'.repeat(64),
      output: { status: 'passed' },
    });

    // A brand-new instance stands in for the restarted process.
    const entries = await new FileRunJournalAdapter({ directory: dir }).read('corr-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].output).toEqual({ status: 'passed' });
  });

  it('reads back an unknown run as empty, not as an error', async () => {
    expect(await new FileRunJournalAdapter({ directory: dir }).read('never-ran')).toEqual([]);
  });

  it('skips a truncated tail — the expected damage from a kill mid-write', async () => {
    const journal = new FileRunJournalAdapter({ directory: dir });
    await journal.append({
      runId: 'corr-2',
      step: 'ground',
      at: FIXED_NOW,
      inputHash: 'a'.repeat(64),
      outputHash: 'b'.repeat(64),
      output: { chunks: [] },
    });
    const { appendFileSync } = require('node:fs') as typeof import('node:fs');
    appendFileSync(join(dir, 'corr-2.jsonl'), '{"runId":"corr-2","step":"harn');

    const entries = await journal.read('corr-2');
    expect(entries).toHaveLength(1);
    expect(entries[0].step).toBe('ground');
  });
});

describe('AgentRuntimeService resumes a run killed mid-pipeline (GT-593)', () => {
  it('replays the harness answer instead of re-rolling it after a downstream crash', async () => {
    const journal = new InMemoryRunJournalAdapter();
    const harness = driftingHarness();
    const core = coreThatFailsOnce();
    const wire = () =>
      createAgentRuntime({
        now: () => FIXED_NOW,
        journal,
        harness: harness.port,
        coreEvaluation: core.port,
      }).runtime;

    // Attempt 1: the harness completes and is journaled; the Core then dies.
    const first = await wire().handle(request('corr-resume'));
    expect(first.status).toBe('error');
    expect(first.summary).toMatch(/process killed mid-pipeline/);
    expect(harness.calls).toBe(1);

    // Attempt 2: same correlated request. The harness is NOT called again — its
    // recorded answer is replayed — and only the Core runs.
    const second = await wire().handle(request('corr-resume'));

    expect(second.status).toBe('passed');
    expect(harness.calls).toBe(1); // ← the whole point
    expect(core.calls).toBe(2);
    expect(second.trace.steps).toContain('resume-journal');
    expect(second.trace.resumedFrom?.runId).toBe('corr-resume');
    expect(second.trace.resumedFrom?.resumed).toContain('harness-execute');
    expect(second.trace.resumedFrom?.recorded).toContain('core-evaluate');
  });

  it('replays the GROUNDING citations so a resumed run cites what the original one did', async () => {
    const knowledge = new InMemoryKnowledgeAdapter();
    knowledge.seed([
      {
        chunkId: 'c1',
        sourceFile: 'reference/core/architecture/adrs/core/0002-hexagonal.md',
        sectionHeading: 'Rules',
        adrId: 'ADR-0002',
        language: 'en',
        tokenEstimate: 12,
        textPreview: 'the validate_discovery_gate rule requires a prd',
        text: 'The validate_discovery_gate rule requires a PRD before the gate passes.',
        corpusVersion: 'abc123def456',
      },
    ]);
    const journal = new InMemoryRunJournalAdapter();
    const core = coreThatFailsOnce();
    const wire = () =>
      createAgentRuntime({ now: () => FIXED_NOW, journal, knowledge, coreEvaluation: core.port })
        .runtime;

    await wire().handle(request('corr-ground')); // dies in the Core

    // The corpus is REPLACED between attempts. A re-run would cite the new corpus;
    // a resume cites what was actually retrieved the first time.
    knowledge.seed([]);
    const second = await wire().handle(request('corr-ground'));

    expect(second.trace.resumedFrom?.resumed).toContain('ground');
    expect(second.trace.groundedBy?.corpusVersion).toBe('abc123def456');
    expect(second.trace.groundedBy?.citations[0]).toContain('0002-hexagonal.md#Rules');
  });

  it('WITHOUT a correlationId there is no run identity, so nothing is journaled', async () => {
    const journal = new InMemoryRunJournalAdapter();
    const harness = driftingHarness();
    const runtime = createAgentRuntime({
      now: () => FIXED_NOW,
      journal,
      harness: harness.port,
    }).runtime;

    const result = await runtime.handle(request()); // no correlation_id

    expect(result.status).toBe('passed');
    expect(result.trace.resumedFrom).toBeUndefined();
    expect(journal.runIds()).toEqual([]);
  });

  it('WITHOUT a journal the runtime behaves exactly as before (opt-in wiring)', async () => {
    const harness = driftingHarness();
    const wire = () =>
      createAgentRuntime({ now: () => FIXED_NOW, harness: harness.port }).runtime;

    await wire().handle(request('corr-none'));
    await wire().handle(request('corr-none'));

    expect(harness.calls).toBe(2); // re-run, not resumed
  });

  it('NOT RESUMABLE: an approval is re-decided on every attempt, never replayed', async () => {
    // A capability that requires approval, granted for attempt 1 only. If the
    // grant were journaled, attempt 2 would sail through on a stale decision.
    const journal = new InMemoryRunJournalAdapter();
    const approval = new PendingApprovalAdapter();
    const harness = driftingHarness();
    const gated = {
      id: 'gated-capability',
      description: 'requires a human',
      intents: ['gated_intent'],
      kind: 'harness' as const,
      harnessCapability: 'sdlc-phase-gate-validator',
      permissions: ['write:report'],
      requiresApproval: true,
      emitsTrace: true,
      requiresPolicy: false,
    };
    const registry = {
      list: async () => [gated],
      resolve: async () => gated,
      register: async () => undefined,
    };
    const gatedRequest = parseAgentRuntimeRequest({
      tenant: 'tenant_demo',
      intent: 'gated_intent',
      correlation_id: 'corr-approval',
    });
    const wire = () =>
      createAgentRuntime({
        now: () => FIXED_NOW,
        journal,
        approval,
        harness: harness.port,
        skillRegistry: registry,
      }).runtime;

    // Attempt 1: pending ⇒ blocked, nothing executed, nothing journaled.
    expect((await wire().handle(gatedRequest)).status).toBe('blocked');
    expect(harness.calls).toBe(0);

    // A human approves, attempt 2 runs and journals the execution.
    const [pending] = await approval.list('pending');
    await approval.approve(pending.id, 'alice');
    expect((await wire().handle(gatedRequest)).status).toBe('passed');
    expect(harness.calls).toBe(1);

    // The approval is NOT in the journal — only pipeline steps are.
    const entries = await journal.read('corr-approval');
    expect(entries.map((e) => e.step)).toEqual(['ground', 'harness-execute']);
    expect(entries.some((e) => String(e.step).includes('approval'))).toBe(false);
  });
});
