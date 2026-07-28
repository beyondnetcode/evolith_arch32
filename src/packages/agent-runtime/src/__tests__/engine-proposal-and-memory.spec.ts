/**
 * GT-610 — engine-proposed arguments must be REVALIDATED and MERGED before the
 *          capability executes (and the decision recorded in the trace).
 * GT-612 — agent memory must be READ back into the plan context, bounded, so
 *          turn 2 knows about turn 1.
 *
 * Every test here fails against the pre-fix runtime: it read only
 * `plan.proposedTool` (dropping `plan.proposedArguments` on the floor) and never
 * called `memory.history()` anywhere in `src`.
 */

import { createAgentRuntime } from '../bootstrap';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { LocalSkillRegistryAdapter } from '../adapters/skills/local-skill-registry.adapter';
import { InMemoryMemoryAdapter } from '../adapters/memory/in-memory-memory.adapter';
import { SwarmsAgentAdapter, type SwarmsClient } from '../adapters/engine/swarms-agent.adapter';
import { renderPlanHistory } from '../adapters/engine/plan-history';
import { mergeEngineArguments } from '../application/engine-argument-merge';
import type {
  AgentEnginePlan,
  AgentPlanContext,
  IAgentEnginePort,
} from '../domain/ports/agent-engine.port';
import type { IHarnessPort, HarnessExecutionResult } from '../domain/ports/harness.port';
import type { IMemoryPort } from '../domain/ports/memory.port';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';

const FIXED_NOW = '2026-07-27T00:00:00.000Z';

/** A harness-backed skill with NO declared input contract. */
const PLAIN_SKILL: SkillDescriptor = {
  id: 'run-audit',
  description: 'Run an audit.',
  intents: ['run_audit'],
  kind: 'harness',
  harnessCapability: 'audit-capability',
  permissions: ['read:repo'],
  requiresApproval: false,
  emitsTrace: true,
  requiresPolicy: false,
};

/** The same skill, with a declared input contract to revalidate against. */
const CONTRACT_SKILL: SkillDescriptor = {
  ...PLAIN_SKILL,
  inputs: {
    scope: { type: 'string', enum: ['repo', 'service'] },
    depth: { type: 'integer' },
  },
};

/** Records what the engine was handed and returns a scripted plan. */
class SpyEngine implements IAgentEnginePort {
  readonly calls: Array<{
    request: AgentRuntimeRequest;
    skills: readonly SkillDescriptor[];
    planContext?: AgentPlanContext;
  }> = [];

  constructor(private readonly scripted: Partial<AgentEnginePlan> = {}) {}

  async plan(
    request: AgentRuntimeRequest,
    skills: readonly SkillDescriptor[],
    planContext?: AgentPlanContext,
  ): Promise<AgentEnginePlan> {
    this.calls.push({ request, skills, planContext });
    return {
      engine: 'spy',
      rationale: 'scripted',
      proposedTool: PLAIN_SKILL.id,
      ...this.scripted,
    };
  }
}

function harnessSpy(): { port: IHarnessPort; args: Array<Record<string, unknown> | undefined> } {
  const args: Array<Record<string, unknown> | undefined> = [];
  const port: IHarnessPort = {
    discover: async () => [],
    describe: async () => undefined,
    execute: async (req): Promise<HarnessExecutionResult> => {
      args.push(req.args as Record<string, unknown> | undefined);
      return { ok: true, capability: req.capability, data: { status: 'passed', missing_artifacts: [] } };
    },
  };
  return { port, args };
}

/** An intent the registry cannot resolve, so the ENGINE is consulted. */
function chatRequest(parameters?: Record<string, unknown>, correlationId = 'corr-args') {
  return parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith',
    initiative: 'init_1',
    intent: 'please audit this repository for me',
    correlation_id: correlationId,
    parameters,
  });
}

function buildRuntime(opts: {
  skill?: SkillDescriptor;
  engine: IAgentEnginePort;
  harness: IHarnessPort;
  memory?: IMemoryPort;
  engineArgumentPolicy?: 'gap-fill' | 'contract-only';
  memoryHistoryLimit?: number;
}) {
  return createAgentRuntime({
    now: () => FIXED_NOW,
    skillRegistry: new LocalSkillRegistryAdapter([opts.skill ?? PLAIN_SKILL]),
    engine: opts.engine,
    harness: opts.harness,
    memory: opts.memory ?? new InMemoryMemoryAdapter(() => FIXED_NOW),
    engineArgumentPolicy: opts.engineArgumentPolicy,
    memoryHistoryLimit: opts.memoryHistoryLimit,
  });
}

describe('GT-610 — engine-proposed arguments reach execution, revalidated', () => {
  it('applies engine arguments the caller did NOT supply, and traces the source', async () => {
    const harness = harnessSpy();
    const engine = new SpyEngine({ proposedArguments: { gate: 'prd_readiness', scope: 'repo' } });
    const { runtime } = buildRuntime({ engine, harness: harness.port });

    const result = await runtime.handle(chatRequest({ gate: 'prd_readiness' }));

    // The capability RUNS with the proposed argument — pre-fix it ran with `{ gate }` only.
    expect(harness.args[0]).toEqual({ gate: 'prd_readiness', scope: 'repo' });
    expect(result.trace.argumentSource).toMatchObject({
      source: 'engine-merged',
      engine: 'spy',
      contract: 'absent',
      accepted: ['scope'],
      echoed: ['gate'], // engines default proposedArguments to request.parameters
      rejected: [],
    });
    expect(result.trace.steps).toContain('merge-engine-arguments');
  });

  it('never lets the engine OVERRIDE a caller-supplied value', async () => {
    const harness = harnessSpy();
    const engine = new SpyEngine({ proposedArguments: { gate: 'engine_override' } });
    const { runtime } = buildRuntime({ engine, harness: harness.port });

    const result = await runtime.handle(chatRequest({ gate: 'caller_value' }));

    expect(harness.args[0]).toEqual({ gate: 'caller_value' });
    expect(result.trace.argumentSource).toMatchObject({
      source: 'caller',
      accepted: [],
      rejected: [{ key: 'gate', reason: 'caller-authoritative' }],
    });
  });

  it('revalidates against the skill’s declared input contract', async () => {
    const harness = harnessSpy();
    const engine = new SpyEngine({
      proposedArguments: { scope: 42, depth: 3, sudo: true, mode: 'service' },
    });
    const { runtime } = buildRuntime({ skill: CONTRACT_SKILL, engine, harness: harness.port });

    const result = await runtime.handle(chatRequest());

    // Only the declared, well-typed key survives.
    expect(harness.args[0]).toEqual({ depth: 3 });
    const decision = result.trace.argumentSource!;
    expect(decision.contract).toBe('declared');
    expect(decision.accepted).toEqual(['depth']);
    expect(decision.rejected).toEqual(
      expect.arrayContaining([
        { key: 'scope', reason: 'type-mismatch:string' },
        { key: 'sudo', reason: 'not-in-input-contract' },
        { key: 'mode', reason: 'not-in-input-contract' },
      ]),
    );
  });

  it('rejects an out-of-enum value declared by the contract', async () => {
    const harness = harnessSpy();
    const engine = new SpyEngine({ proposedArguments: { scope: 'everything' } });
    const { runtime } = buildRuntime({ skill: CONTRACT_SKILL, engine, harness: harness.port });

    const result = await runtime.handle(chatRequest());

    expect(harness.args[0]).toBeUndefined();
    expect(result.trace.argumentSource!.rejected).toEqual([{ key: 'scope', reason: 'not-in-enum' }]);
  });

  it('refuses prototype-polluting keys and non-serializable values', async () => {
    const harness = harnessSpy();
    // JSON.parse is how a real engine payload arrives — and it DOES create an
    // own `__proto__` property, unlike an object literal.
    const proposed = JSON.parse('{"__proto__":{"polluted":true},"scope":"repo"}') as Record<string, unknown>;
    proposed.callback = () => 'not JSON';
    const engine = new SpyEngine({ proposedArguments: proposed });
    const { runtime } = buildRuntime({ engine, harness: harness.port });

    const result = await runtime.handle(chatRequest());

    expect(harness.args[0]).toEqual({ scope: 'repo' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(result.trace.argumentSource!.rejected).toEqual(
      expect.arrayContaining([
        { key: '__proto__', reason: 'unsafe-key' },
        { key: 'callback', reason: 'non-serializable' },
      ]),
    );
  });

  it('under `contract-only`, a skill with no declared contract accepts nothing from the engine', async () => {
    const harness = harnessSpy();
    const engine = new SpyEngine({ proposedArguments: { scope: 'repo' } });
    const { runtime } = buildRuntime({
      engine,
      harness: harness.port,
      engineArgumentPolicy: 'contract-only',
    });

    const result = await runtime.handle(chatRequest());

    expect(harness.args[0]).toBeUndefined();
    expect(result.trace.argumentSource).toMatchObject({
      source: 'caller',
      policy: 'contract-only',
      rejected: [{ key: 'scope', reason: 'no-input-contract' }],
    });
  });

  it('leaves the caller set untouched when no engine is consulted (skill resolves directly)', async () => {
    const harness = harnessSpy();
    const engine = new SpyEngine({ proposedArguments: { scope: 'repo' } });
    const { runtime } = buildRuntime({ engine, harness: harness.port });

    const request = parseAgentRuntimeRequest({
      intent: 'run_audit', // resolves in the registry — the engine is never asked
      tool: 'run-audit',
      parameters: { gate: 'g' },
      correlation_id: 'corr-direct',
    });
    const result = await runtime.handle(request);

    expect(engine.calls).toHaveLength(0);
    expect(harness.args[0]).toEqual({ gate: 'g' });
    expect(result.trace.argumentSource).toBeUndefined();
  });

  it('mergeEngineArguments is pure and reports the decision (unit)', () => {
    const merged = mergeEngineArguments({
      caller: { a: 1 },
      proposed: { a: 1, b: 2 },
      skill: {},
      engine: 'unit',
    });
    expect(merged.parameters).toEqual({ a: 1, b: 2 });
    expect(merged.decision).toEqual({
      source: 'engine-merged',
      engine: 'unit',
      contract: 'absent',
      policy: 'gap-fill',
      accepted: ['b'],
      echoed: ['a'],
      rejected: [],
    });
  });
});

describe('GT-612 — conversation memory is read back into the plan context', () => {
  it('turn 2 receives turn 1 in the plan context, and the trace records how much', async () => {
    const memory = new InMemoryMemoryAdapter(() => FIXED_NOW);
    const engine = new SpyEngine();
    const harness = harnessSpy();
    const { runtime } = buildRuntime({ engine, harness: harness.port, memory });

    await runtime.handle(chatRequest(undefined, 'corr-conv'));
    const second = await runtime.handle(chatRequest(undefined, 'corr-conv'));

    // Turn 1 planned blank; turn 2 planned WITH turn 1 (request + result entries).
    expect(engine.calls[0].planContext?.history).toEqual([]);
    const history = engine.calls[1].planContext?.history ?? [];
    expect(history).toHaveLength(2);
    expect((history[0].value as { kind: string }).kind).toBe('request');
    expect((history[1].value as { kind: string }).kind).toBe('result');
    expect(engine.calls[1].planContext?.conversationNamespace).toBe('conv:corr-conv');

    expect(second.trace.recalledMemory).toEqual({
      namespace: 'conv:corr-conv',
      entries: 2,
      limit: 20, // DEFAULT_MEMORY_HISTORY_LIMIT ≈ 10 turns (request + result each)
    });
    expect(second.trace.steps).toContain('recall-conversation');
  });

  it('bounds the history it feeds (an unbounded transcript is its own defect)', async () => {
    const memory = new InMemoryMemoryAdapter(() => FIXED_NOW);
    for (let i = 0; i < 30; i += 1) {
      await memory.append('conv:corr-bound', { kind: 'request', n: i });
    }
    const engine = new SpyEngine();
    const harness = harnessSpy();
    const { runtime } = buildRuntime({
      engine,
      harness: harness.port,
      memory,
      memoryHistoryLimit: 4,
    });

    const result = await runtime.handle(chatRequest(undefined, 'corr-bound'));

    const history = engine.calls[0].planContext?.history ?? [];
    expect(history).toHaveLength(4);
    expect((history[3].value as { n: number }).n).toBe(29); // most recent kept
    expect(result.trace.recalledMemory).toEqual({
      namespace: 'conv:corr-bound',
      entries: 4,
      limit: 4,
    });
  });

  it('never fails a governed run when the memory store cannot be read', async () => {
    const failing: IMemoryPort = {
      remember: async () => undefined,
      recall: async () => undefined,
      append: async () => undefined,
      history: async () => {
        throw new Error('memory outage');
      },
    };
    const engine = new SpyEngine();
    const harness = harnessSpy();
    const { runtime } = buildRuntime({ engine, harness: harness.port, memory: failing });

    const result = await runtime.handle(chatRequest());

    expect(result.status).toBe('passed');
    expect(engine.calls[0].planContext?.history).toBeUndefined();
    expect(result.trace.recalledMemory).toBeUndefined();
  });

  it('renderPlanHistory caps the transcript handed to an engine prompt', async () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      at: FIXED_NOW,
      value: { kind: 'request', filler: 'x'.repeat(400), n: i },
    }));

    const transcript = renderPlanHistory(entries)!;
    expect(transcript.length).toBeLessThanOrEqual(2100); // 2000 + truncation marker
    expect(transcript).toContain('older turns omitted');
    expect(transcript.split('\n').filter((l) => l.includes('"n":')).length).toBeLessThanOrEqual(10);
    expect(renderPlanHistory([])).toBeUndefined();

    // …and the engine adapter actually passes that bounded transcript through.
    let seen: Record<string, unknown> | undefined;
    const client: SwarmsClient = {
      orchestrate: async (input) => {
        seen = input.context as Record<string, unknown>;
        return { selectedTool: 'run-audit', rationale: 'ok', agentsInvolved: ['a'] };
      },
    };
    await new SwarmsAgentAdapter({ client }).plan(chatRequest(), [PLAIN_SKILL], { history: entries });
    expect(typeof seen!.history).toBe('string');
    expect((seen!.history as string).length).toBeLessThanOrEqual(2100);
  });
});
