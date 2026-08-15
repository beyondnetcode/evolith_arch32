import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import type { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';
import type { ConfigService } from '../../infrastructure/config/config.service';
import { CLI_EXIT_CODES } from '../../infrastructure/cli/exit-codes';
import { WaiverCommand } from './waiver.command';

/**
 * GT-677 — the END-TO-END row this gap is about: `evolith waiver` writes, `evolith
 * evaluate` reads, and an APPROVED waiver actually suppresses the finding the gate just
 * printed. Both halves shipped in GT-518 and were never connected — `evaluateDriftGate`
 * was called without its `waivers` argument on every shipped path, so the domain's own
 * waiver tests passed green while the product suppressed nothing (94 → 94).
 *
 * These tests drive the REAL commands over the REAL file-backed store in a temp
 * workspace. Only the orchestrator is mocked (a canned result); `evaluateDriftGate`,
 * `emitEvaluationEvidence` and `FileWaiverStore` are the real ones — mocking any of
 * them would prove nothing about the wiring this gap is about.
 */

jest.mock('chalk', () => {
  const id = (s: string) => s;
  const proxy: any = new Proxy(id, { get: () => id });
  return { __esModule: true, default: proxy, green: id, red: id, yellow: id, blue: id, bold: id, cyan: id, gray: id, magenta: id, white: id };
});

jest.mock('../../infrastructure/paths/core-resolver', () => ({
  resolveCoreOverride: jest.fn(() => undefined),
}));
jest.mock('../../infrastructure/paths/rulesets-resolver', () => ({
  resolveRulesets: jest.fn(() => ({ coreRoot: '/resolved/core' })),
}));

/**
 * Canned result with ONE blocking finding.
 *
 * `evaluatedAt` is the gate's default `now` (drift-gate.ts), and it is deliberately in
 * the FUTURE relative to the wall clock: `requestWaiver` refuses an `expiresAt` at or
 * before the wall-clock `requestedAt`, so an expiry that is valid to write but ALREADY
 * EXPIRED at evaluation time is only expressible when the evaluation instant sits after
 * the writing instant. That lets T8 exercise expiry through the real command instead of
 * hand-seeding a store file. Every expiry below is pinned relative to THIS instant.
 */
const EVALUATED_AT = '2099-06-01T00:00:00.000Z';
const EXPIRY_ACTIVE = '2099-12-01T00:00:00.000Z'; // after EVALUATED_AT → still active
const EXPIRY_LAPSED = '2099-01-01T00:00:00.000Z'; // before EVALUATED_AT → already expired

const RESULT = {
  overallVerdict: 'PASS',
  outcome: 'approved',
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
  correlationId: 'corr-1',
  schemaVersion: '1.0.0',
};

const evaluateMock = jest.fn().mockResolvedValue(RESULT);
jest.mock('@beyondnet/evolith-core-domain/evaluation', () => {
  const actual = jest.requireActual('@beyondnet/evolith-core-domain/evaluation');
  return {
    ...actual, // evaluateDriftGate / emitEvaluationEvidence stay REAL
    createDefaultKindEvaluators: jest.fn(() => []),
    EvaluationOrchestrator: jest.fn().mockImplementation(() => ({ evaluate: evaluateMock })),
  };
});

// Imported after the mocks so the command binds to the mocked module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EvaluateCommand } = require('./../evaluate/evaluate.command');

function buildPrompt(): PromptService {
  return {
    showIntro: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showSuccess: jest.fn(),
    showOutro: jest.fn(),
    showError: jest.fn(),
    stopSpinner: jest.fn(),
  } as unknown as PromptService;
}

/** A stub profile — a real ConfigService would read the developer's own satellite. */
function buildConfig(profile: Record<string, unknown> = {}): ConfigService {
  return { getProfile: () => profile } as unknown as ConfigService;
}

describe('GT-677 · waiver → drift-gate round trip (real store, real gate)', () => {
  let workspace: string;
  let elsewhere: string;
  let log: jest.SpyInstance;
  let exit: jest.SpyInstance;

  /** Everything printed on stdout so far. */
  function stdout(): string {
    return log.mock.calls.map((c) => String(c[0])).join('\n');
  }

  /** Run `evolith evaluate --format drift` against the temp workspace. */
  async function runGate(options: Record<string, unknown> = {}): Promise<{ body: string; evidence: Record<string, any> }> {
    log.mockClear();
    exit.mockClear();
    const command = new EvaluateCommand(
      { execute: jest.fn() } as unknown as ValidateSatelliteUseCase,
      {} as any,
      {} as any,
      {} as any,
      {} as unknown as RulesetValidatorService,
      buildPrompt(),
      buildConfig(),
    );
    const evidencePath = join(workspace, `evidence-${Math.random().toString(36).slice(2)}.json`);
    await command.executeCommand([], { format: 'drift', workspace, evidence: evidencePath, ...options });
    return { body: stdout(), evidence: JSON.parse(readFileSync(evidencePath, 'utf8')) };
  }

  /** Drive the REAL waiver command, from a cwd that is NOT the workspace. */
  async function waiver(action: string, options: Record<string, unknown>): Promise<void> {
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(elsewhere);
    try {
      const command = new WaiverCommand(buildPrompt(), buildConfig());
      await command.executeCommand([action], { workspace, ...options });
    } finally {
      cwdSpy.mockRestore();
    }
  }

  /** The fingerprint the gate itself printed — never hand-written. */
  function fingerprintFrom(body: string): string {
    const match = /\[fp `([0-9a-f]{16})`\]/.exec(body);
    expect(match).not.toBeNull();
    return match![1];
  }

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'evolith-gt677-ws-'));
    elsewhere = mkdtempSync(join(tmpdir(), 'evolith-gt677-cwd-'));
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(workspace, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  });

  it('T7 · an approved waiver, requested from a DIFFERENT cwd, suppresses the finding the gate printed', async () => {
    const first = await runGate();
    // Baseline: the run BLOCKS and prints a fingerprint a human can act on.
    expect(first.body).toContain(':no_entry: **Blocked**');
    expect(exit).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
    expect(first.evidence.blockingFailures).toBe(1);
    expect(first.evidence.violations[0].frozen).toBeFalsy();

    const fp = fingerprintFrom(first.body);
    await waiver('request', { ref: 'W-1', fingerprint: fp, reason: 'GT-677', by: 'jdoe', expires: EXPIRY_ACTIVE });
    await waiver('approve', { ref: 'W-1', by: 'lead' });
    // The waiver landed under the WORKSPACE, not under the cwd it was approved from.
    expect(existsSync(join(workspace, '.evolith', 'waivers.json'))).toBe(true);
    expect(existsSync(join(elsewhere, '.evolith', 'waivers.json'))).toBe(false);

    const second = await runGate();
    expect(second.body).toContain('Waived findings');
    expect(second.body).toContain('`W-1`@v1');
    expect(second.body).toContain(EXPIRY_ACTIVE);
    expect(second.body).toContain(':white_check_mark: No blocking architecture violations.');
    expect(exit).not.toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
    // The --evidence manifest is the artifact CI reads; it must agree with the comment.
    expect(second.evidence.violations[0].frozen).toBe(true);
    expect(second.evidence.blockingFailures).toBe(0);
    expect(second.evidence.waiverRef).toBe('W-1');
  });

  it('T8 · an EXPIRED approved waiver re-blocks', async () => {
    const first = await runGate();
    const fp = fingerprintFrom(first.body);
    // Written and approved legitimately, but its expiry precedes the evaluation instant.
    await waiver('request', { ref: 'W-1', fingerprint: fp, reason: 'GT-677', by: 'jdoe', expires: EXPIRY_LAPSED });
    await waiver('approve', { ref: 'W-1', by: 'lead' });

    const second = await runGate();
    expect(second.body).not.toContain('Waived findings');
    expect(second.body).toContain(':no_entry: **Blocked**');
    expect(exit).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
    expect(second.evidence.blockingFailures).toBe(1);
    expect(second.evidence.violations[0].frozen).toBeFalsy();
  });

  it('T9 · a requested-but-unapproved waiver re-blocks (request without approve)', async () => {
    const first = await runGate();
    const fp = fingerprintFrom(first.body);
    await waiver('request', { ref: 'W-1', fingerprint: fp, reason: 'GT-677', by: 'jdoe', expires: EXPIRY_ACTIVE });

    const second = await runGate();
    expect(second.body).not.toContain('Waived findings');
    expect(second.body).toContain(':no_entry: **Blocked**');
    expect(exit).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
    expect(second.evidence.blockingFailures).toBe(1);
  });

  it('T9-neg · a REJECTED waiver re-blocks', async () => {
    const first = await runGate();
    const fp = fingerprintFrom(first.body);
    await waiver('request', { ref: 'W-1', fingerprint: fp, reason: 'GT-677', by: 'jdoe', expires: EXPIRY_ACTIVE });
    // `rejected` is a stored status the CLI cannot yet write; rewrite the record the
    // command produced rather than inventing one, so the fingerprint stays derived.
    const storePath = join(workspace, '.evolith', 'waivers.json');
    const stored = JSON.parse(readFileSync(storePath, 'utf8'));
    stored[0].status = 'rejected';
    require('node:fs').writeFileSync(storePath, JSON.stringify(stored), 'utf8');

    const second = await runGate();
    expect(second.body).not.toContain('Waived findings');
    expect(exit).toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
    expect(second.evidence.blockingFailures).toBe(1);
  });

  it('T3-e2e · an approved waiver with a mistyped fingerprint suppresses nothing and is REPORTED', async () => {
    const first = await runGate();
    await waiver('request', {
      ref: 'W-42', fingerprint: 'deadbeefdeadbeef', reason: 'typo', by: 'jdoe', expires: EXPIRY_ACTIVE,
    });
    await waiver('approve', { ref: 'W-42', by: 'lead' });

    const second = await runGate();
    expect(second.evidence.blockingFailures).toBe(1);
    // The silent no-op GT-677 measured is now visible to the human reading the comment.
    expect(second.body).toContain('matched no finding in this run');
    expect(second.body).toContain('W-42');
    expect(first.evidence.blockingFailures).toBe(1);
  });

  it('T10 · an explicit --waivers path outside the workspace is honoured', async () => {
    // `.evolith/` is gitignored, so a CI job needs a committed store the writer and the
    // reader both point at explicitly. This is that path.
    const shared = join(elsewhere, 'ci', 'waivers.json');
    const first = await runGate();
    const fp = fingerprintFrom(first.body);
    await waiver('request', { ref: 'W-1', fingerprint: fp, reason: 'GT-677', by: 'jdoe', expires: EXPIRY_ACTIVE, store: shared });
    await waiver('approve', { ref: 'W-1', by: 'lead', store: shared });
    // Nothing was written to the workspace default — the override really was used.
    expect(existsSync(join(workspace, '.evolith', 'waivers.json'))).toBe(false);

    const second = await runGate({ waivers: shared });
    expect(second.body).toContain('Waived findings');
    expect(second.evidence.violations[0].frozen).toBe(true);
    expect(second.evidence.blockingFailures).toBe(0);
    expect(exit).not.toHaveBeenCalledWith(CLI_EXIT_CODES.BLOCKED);
  });

  it('T10-neg · the same run WITHOUT --waivers still blocks (the store is not found by accident)', async () => {
    const shared = join(elsewhere, 'ci', 'waivers.json');
    const first = await runGate();
    const fp = fingerprintFrom(first.body);
    await waiver('request', { ref: 'W-1', fingerprint: fp, reason: 'GT-677', by: 'jdoe', expires: EXPIRY_ACTIVE, store: shared });
    await waiver('approve', { ref: 'W-1', by: 'lead', store: shared });

    const second = await runGate(); // default store: <workspace>/.evolith/waivers.json
    expect(second.body).toContain(':no_entry: **Blocked**');
    expect(second.evidence.blockingFailures).toBe(1);
  });
});
