import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  approveWaiver,
  rejectWaiver,
  requestWaiver,
  type Waiver,
} from '@beyondnet/evolith-core-domain/domain/waiver';
import { emitEvaluationEvidence } from '@beyondnet/evolith-core-domain/evaluation';
import { EvaluateTool } from './evaluate.tool';

describe('EvaluateTool (GT-378, MCP surface)', () => {
  const tool = new EvaluateTool({} as any, {} as any);

  it('exposes the canonical evolith-evaluate schema', () => {
    expect(tool.schema.name).toBe('evolith-evaluate');
    expect(tool.schema.inputSchema.type).toBe('object');
    const props = tool.schema.inputSchema.properties as Record<string, unknown>;
    // Context-only identifiers + canonical anchors are accepted.
    for (const key of ['kinds', 'workspaceRef', 'tenant', 'product', 'initiative', 'phaseId', 'gateId']) {
      expect(props).toHaveProperty(key);
    }
    // No required fields: a minimal context (defaults to cwd) is valid.
    expect(tool.schema.inputSchema.required).toEqual([]);
  });

  it('T12 · exposes an optional waiverStore argument without making anything required', () => {
    const props = tool.schema.inputSchema.properties as Record<string, { description?: string }>;
    expect(props).toHaveProperty('waiverStore');
    expect(props.waiverStore.description).toMatch(/waiver/i);
    // GT-677: the tool READS waivers; issuing/approving them stays a human act, so
    // adding this argument must not have made the tool mutative or its schema stricter.
    expect(tool.schema.inputSchema.required).toEqual([]);
  });
});

/**
 * GT-677 — the MCP surface deposited a violation set built WITHOUT a waiver store (and
 * without CODEOWNERS, while its own comment claimed owner enrichment), so an approved
 * waiver never reached the ledger's `frozen` bit and the CLI and MCP disagreed about the
 * same workspace. The decision is consumed only by the deposit, so this drives a real
 * deposit through a stubbed `globalThis.fetch` and asserts on the payload — a test that
 * only called `execute()` would pass whether or not the store was ever read.
 */
describe('EvaluateTool · waiver suppression on the deposited payload (GT-677)', () => {
  const EVALUATED_AT = '2026-07-12T00:00:00.000Z';
  const RESULT = {
    overallVerdict: 'FAIL',
    outcome: 'rejected',
    results: {},
    rulesExecuted: [{ ruleId: 'ADR-0002', engine: 'native' }],
    policiesApplied: [],
    gaps: [
      { id: 'g1', requirementRef: 'ADR-0002', severity: 'error', message: 'boundary violated', location: 'src/a.ts:12:3' },
    ],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    confidence: 0.9,
    rationale: 'test',
    versions: { core: '1.2.3' },
    evaluatedAt: EVALUATED_AT,
    correlationId: 'corr-mcp-1',
    schemaVersion: '1.0.0',
  };

  // Derived, never hand-written — the same fingerprint the gate will compute.
  const FP = emitEvaluationEvidence(RESULT as never, 'drift-gate').violations[0].fingerprint;
  const requested = requestWaiver({
    waiverRef: 'W-42',
    fingerprint: FP,
    reason: 'GT-677',
    requestedBy: 'alice',
    // Pinned relative to RESULT.evaluatedAt — the gate's default `now` — not to the wall clock.
    requestedAt: '2026-07-01T00:00:00.000Z',
    expiresAt: '2026-08-01T00:00:00.000Z',
  });

  let workspace: string;
  let fetchSpy: jest.SpyInstance;
  const originalEnv = { ...process.env };

  /** Seed the workspace's default store with exactly these waiver records. */
  function seedStore(waivers: readonly Waiver[], file = join(workspace, '.evolith', 'waivers.json')): string {
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, JSON.stringify(waivers), 'utf8');
    return file;
  }

  /** Run the tool and return the ingest payload the Tracker would have received. */
  async function deposit(args: Record<string, unknown> = {}): Promise<Record<string, any>> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { EvaluateTool: Tool } = require('./evaluate.tool');
    const tool = new Tool({} as any, {} as any);
    await tool.execute({ workspaceRef: workspace, ...args });
    expect(fetchSpy).toHaveBeenCalled();
    const init = fetchSpy.mock.calls[0][1] as { body: string };
    return JSON.parse(init.body);
  }

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'evolith-gt677-mcp-'));
    process.env.EVOLITH_TRACKER_URL = 'https://tracker.test';
    process.env.EVOLITH_TRACKER_API_KEY = 'k'.repeat(32);
    fetchSpy = jest.spyOn(globalThis, 'fetch' as never).mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ accepted: true, evaluationId: 'e-1' }),
      text: async () => '{"accepted":true,"evaluationId":"e-1"}',
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    rmSync(workspace, { recursive: true, force: true });
  });

  it('T13 · honours an approved waiver in the workspace store when depositing', async () => {
    seedStore([approveWaiver(requested, 'bob', '2026-07-02T00:00:00.000Z')]);

    const payload = await deposit();

    expect(payload.violations[0].frozen).toBe(true);
    expect(payload.blockingViolationCount).toBe(0);
  });

  it('T13-neg · a REJECTED waiver leaves the finding blocking in the deposited payload', async () => {
    seedStore([rejectWaiver(requested)]);

    const payload = await deposit();

    expect(payload.violations[0].frozen).toBeFalsy();
    expect(payload.blockingViolationCount).toBe(1);
  });

  it('T13-neg · a requested-but-unapproved waiver leaves the finding blocking', async () => {
    seedStore([requested]);

    const payload = await deposit();

    expect(payload.violations[0].frozen).toBeFalsy();
    expect(payload.blockingViolationCount).toBe(1);
  });

  it('T13-neg · an EXPIRED approved waiver leaves the finding blocking', async () => {
    seedStore([
      approveWaiver(
        requestWaiver({ ...requested, expiresAt: '2026-07-05T00:00:00.000Z' }),
        'bob',
        '2026-07-02T00:00:00.000Z',
      ),
    ]);

    const payload = await deposit();

    expect(payload.violations[0].frozen).toBeFalsy();
    expect(payload.blockingViolationCount).toBe(1);
  });

  it('T13 · honours an explicit waiverStore path outside the workspace', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'evolith-gt677-ci-'));
    try {
      const file = seedStore(
        [approveWaiver(requested, 'bob', '2026-07-02T00:00:00.000Z')],
        join(outside, 'ci-waivers.json'),
      );

      const payload = await deposit({ waiverStore: file });

      expect(payload.violations[0].frozen).toBe(true);
      expect(payload.blockingViolationCount).toBe(0);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('T13-neg · no store at all deposits the finding as blocking (no accidental suppression)', async () => {
    const payload = await deposit();

    expect(payload.violations[0].frozen).toBeFalsy();
    expect(payload.blockingViolationCount).toBe(1);
  });
});

// The orchestrator is the ONLY thing mocked: `evaluateDriftGate` stays real, or these
// tests would prove nothing about whether the tool passes it a store.
jest.mock('@beyondnet/evolith-core-domain/evaluation', () => {
  const actual = jest.requireActual('@beyondnet/evolith-core-domain/evaluation');
  return {
    ...actual,
    createDefaultKindEvaluators: jest.fn(() => []),
    EvaluationOrchestrator: jest.fn().mockImplementation(() => ({
      evaluate: jest.fn().mockImplementation(async () => ({
        overallVerdict: 'FAIL',
        outcome: 'rejected',
        results: {},
        rulesExecuted: [{ ruleId: 'ADR-0002', engine: 'native' }],
        policiesApplied: [],
        gaps: [
          { id: 'g1', requirementRef: 'ADR-0002', severity: 'error', message: 'boundary violated', location: 'src/a.ts:12:3' },
        ],
        risks: [],
        missingEvidence: [],
        incompleteArtifacts: [],
        recommendations: [],
        requiredActions: [],
        confidence: 0.9,
        rationale: 'test',
        versions: { core: '1.2.3' },
        evaluatedAt: '2026-07-12T00:00:00.000Z',
        correlationId: 'corr-mcp-1',
        schemaVersion: '1.0.0',
      })),
    })),
  };
});

/**
 * GT-688 — the MCP surface must be able to EXPRESS a topology composition.
 *
 * The behavioural half (that `design` reaches `manifest.topologies`) lives in
 * `evaluate.tool.composition.spec.ts`: it spies on the use case the tool
 * `await import`s, and the describe blocks above load that module through a
 * different specifier first, which defeats the spy. Split rather than reordered,
 * so neither test depends on the other's module-registry state.
 */
describe('EvaluateTool · the composition argument is published (GT-688)', () => {
  it('publishes `design` on the tool schema without making anything required', () => {
    const t = new EvaluateTool({} as any, {} as any);
    const props = t.schema.inputSchema.properties as Record<string, { description?: string }>;
    expect(props).toHaveProperty('design');
    expect(props.design.description).toMatch(/topologyConfirmedRefs/);
    expect(t.schema.inputSchema.required).toEqual([]);
  });

  it('still documents topologyRef as the single-element shorthand', () => {
    const t = new EvaluateTool({} as any, {} as any);
    const props = t.schema.inputSchema.properties as Record<string, { description?: string }>;
    expect(props.topologyRef.description).toMatch(/shorthand/i);
  });
});
