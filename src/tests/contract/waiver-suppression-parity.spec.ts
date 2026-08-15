import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

/**
 * GT-677 · criterion 4 — a CROSS-SURFACE oracle for waiver suppression.
 *
 * The CLI and the MCP tool each build their own violation set and deposit it in the
 * Tracker's ledger. Before this row, `evaluateDriftGate` was called WITHOUT a waiver
 * store on both, and without CODEOWNERS on MCP — so the two surfaces could disagree
 * about the same workspace and nothing said so. The exploration suite's consistency
 * oracle cannot express this: it compares only success/verdict/phase/evaluatedBy/
 * errorCode, never a waived set.
 *
 * The oracle asks BOTH surfaces the same question — one workspace, one store, one
 * approved waiver — and compares the sorted `[fingerprint, frozen, accountableOwner]`
 * triples of what each one DEPOSITED. The final test shows the oracle going RED when
 * only one surface is given the store, so a green run means something.
 *
 * Only the orchestrator is mocked (both surfaces get the identical canned result);
 * `evaluateDriftGate`, `FileWaiverStore` and the ingest contract are real.
 */

const EVALUATED_AT = '2026-07-12T00:00:00.000Z';

const RESULT = {
  overallVerdict: 'FAIL',
  outcome: 'rejected',
  results: {},
  rulesExecuted: [{ ruleId: 'ADR-0002', engine: 'native' }],
  policiesApplied: [],
  gaps: [
    { id: 'g1', requirementRef: 'ADR-0002', severity: 'error', message: 'boundary violated', location: 'src/a.ts:12:3' },
    { id: 'g2', requirementRef: 'ADR-0002', severity: 'error', message: 'second violation', location: 'src/b.ts:4:1' },
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
  correlationId: 'corr-parity-1',
  schemaVersion: '1.0.0',
};

jest.mock('@beyondnet/evolith-core-domain/evaluation', () => {
  const actual = jest.requireActual('@beyondnet/evolith-core-domain/evaluation');
  return {
    ...actual, // evaluateDriftGate stays REAL on both surfaces
    createDefaultKindEvaluators: jest.fn(() => []),
    EvaluationOrchestrator: jest.fn().mockImplementation(() => ({
      evaluate: jest.fn().mockResolvedValue(RESULT),
    })),
  };
});

jest.mock('../../sdk/cli/src/infrastructure/paths/core-resolver', () => ({
  resolveCoreOverride: jest.fn(() => undefined),
}));
jest.mock('../../sdk/cli/src/infrastructure/paths/rulesets-resolver', () => ({
  resolveRulesets: jest.fn(() => ({ coreRoot: '/resolved/core' })),
}));

// Required after the mocks so both graphs bind to the mocked evaluation module.
/* eslint-disable @typescript-eslint/no-var-requires */
const { EvaluateCommand } = require('../../sdk/cli/src/commands/evaluate/evaluate.command');
const { EvaluateTool } = require('../../packages/mcp-server/src/tools/evaluate.tool');
const { emitEvaluationEvidence } = require('@beyondnet/evolith-core-domain/evaluation');
const { approveWaiver, requestWaiver } = require('@beyondnet/evolith-core-domain/domain/waiver');
/* eslint-enable @typescript-eslint/no-var-requires */

/** One comparable row per deposited violation. */
type Triple = [string, boolean, string | undefined];

function triples(payload: Record<string, any>): Triple[] {
  return (payload.violations as Array<Record<string, any>>)
    .map((v): Triple => [v.fingerprint, Boolean(v.frozen), v.accountableOwner])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

describe('GT-677 · CLI and MCP agree about which findings a waiver suppressed', () => {
  const originalEnv = { ...process.env };
  let workspace: string;
  let emptyStore: string;
  let fetchSpy: jest.SpyInstance;

  function stubFetch(): void {
    fetchSpy = jest.spyOn(globalThis, 'fetch' as never).mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ accepted: true, evaluationId: 'e-1' }),
      text: async () => '{"accepted":true,"evaluationId":"e-1"}',
    } as never);
  }

  /** The payload the CLI deposited for this workspace. */
  async function cliDeposit(options: Record<string, unknown> = {}): Promise<Record<string, any>> {
    fetchSpy.mockClear();
    const command = new EvaluateCommand(
      { execute: jest.fn() },
      {},
      {},
      {},
      {},
      {
        showIntro: jest.fn(), showInfo: jest.fn(), showWarning: jest.fn(),
        showSuccess: jest.fn(), showOutro: jest.fn(), showError: jest.fn(), stopSpinner: jest.fn(),
      },
      { getProfile: () => ({}) },
    );
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    try {
      await command.executeCommand([], { format: 'drift', workspace, ...options });
    } finally {
      log.mockRestore();
      exit.mockRestore();
    }
    expect(fetchSpy).toHaveBeenCalled();
    return JSON.parse((fetchSpy.mock.calls[0][1] as { body: string }).body);
  }

  /** The payload the MCP tool deposited for the same workspace. */
  async function mcpDeposit(args: Record<string, unknown> = {}): Promise<Record<string, any>> {
    fetchSpy.mockClear();
    const tool = new EvaluateTool({}, {});
    await tool.execute({ workspaceRef: workspace, ...args });
    expect(fetchSpy).toHaveBeenCalled();
    return JSON.parse((fetchSpy.mock.calls[0][1] as { body: string }).body);
  }

  beforeEach(() => {
    workspace = mkdtempSync(path.join(tmpdir(), 'evolith-gt677-parity-'));
    // A CODEOWNERS the drift gate can resolve an owner from — the MCP surface passed
    // none before GT-677, which by itself made the two ledgers disagree.
    mkdirSync(path.join(workspace, '.github'), { recursive: true });
    writeFileSync(path.join(workspace, '.github', 'CODEOWNERS'), '*  @org/arch-team\n', 'utf8');

    // ONE approved waiver, for the FIRST of the two findings. The fingerprint is
    // derived from the canonical violation set, never hand-written.
    const violations = emitEvaluationEvidence(RESULT, 'drift-gate').violations;
    const waiver = approveWaiver(
      requestWaiver({
        waiverRef: 'W-42',
        fingerprint: violations[0].fingerprint,
        reason: 'GT-677 parity oracle',
        requestedBy: 'alice',
        // Pinned relative to RESULT.evaluatedAt, the gate's default `now`.
        requestedAt: '2026-07-01T00:00:00.000Z',
        expiresAt: '2026-08-01T00:00:00.000Z',
      }),
      'bob',
      '2026-07-02T00:00:00.000Z',
    );
    mkdirSync(path.join(workspace, '.evolith'), { recursive: true });
    writeFileSync(path.join(workspace, '.evolith', 'waivers.json'), JSON.stringify([waiver]), 'utf8');

    emptyStore = path.join(workspace, 'empty-waivers.json');
    writeFileSync(emptyStore, '[]', 'utf8');

    process.env.EVOLITH_TRACKER_URL = 'https://tracker.test';
    process.env.EVOLITH_TRACKER_API_KEY = 'k'.repeat(32);
    stubFetch();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    rmSync(workspace, { recursive: true, force: true });
  });

  it('T14 · CLI and MCP report the SAME waived set for the same workspace and waiver', async () => {
    const cli = triples(await cliDeposit());
    const mcp = triples(await mcpDeposit());

    expect(cli).toEqual(mcp);
    // …and it is the RIGHT set: exactly the waived fingerprint is frozen on both,
    // with an owner resolved from the same CODEOWNERS.
    expect(cli.filter(([, frozen]) => frozen)).toHaveLength(1);
    expect(cli.filter(([, frozen]) => !frozen)).toHaveLength(1);
    for (const [, , owner] of cli) expect(owner).toBe('@org/arch-team');
    // A store that suppressed nothing would also make the two sets equal; pin the count.
    const cliPayload = await cliDeposit();
    expect(cliPayload.blockingViolationCount).toBe(1);
  });

  it('T15 · the oracle goes RED when the store is passed to one surface only', async () => {
    const cli = triples(await cliDeposit()); // default store: the approved waiver
    const mcp = triples(await mcpDeposit({ waiverStore: emptyStore })); // no waivers

    expect(cli).not.toEqual(mcp);
    expect(cli.some(([, frozen]) => frozen)).toBe(true);
    expect(mcp.every(([, frozen]) => !frozen)).toBe(true);
  });

  it('T15 · the same asymmetry the other way round is caught too', async () => {
    const cli = triples(await cliDeposit({ waivers: emptyStore }));
    const mcp = triples(await mcpDeposit()); // default store: the approved waiver

    expect(cli).not.toEqual(mcp);
    expect(cli.every(([, frozen]) => !frozen)).toBe(true);
    expect(mcp.some(([, frozen]) => frozen)).toBe(true);
  });

  it('never seeds a waiver store inside the repository', () => {
    // Every fixture here lives in a mkdtemp directory. `<repo>/.evolith/` is
    // gitignored, so a stray seed would silently alter a developer's own runs.
    expect(existsSync(path.resolve(__dirname, '../../..', '.evolith', 'waivers.json'))).toBe(false);
  });
});
