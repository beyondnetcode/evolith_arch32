import type { EvaluationResult, GapFinding } from './contracts/evaluation-result';
import { EVALUATION_RESULT_SCHEMA_VERSION } from './contracts/evaluation-result';
import { Verdict } from '../domain/verdict/verdict';
import {
  evaluateDriftGate,
  PrCommentFallbackPublisher,
  DRIFT_GATE_BLOCK_EXIT_CODE,
  DRIFT_GATE_PASS_EXIT_CODE,
} from './drift-gate';
import { parseCodeowners } from '../domain/codeowners';
import { requestWaiver, approveWaiver, rejectWaiver, InMemoryWaiverStore } from '../domain/waiver';
import { evaluationResultToViolations } from './sarif-exporter';

function makeResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    overallVerdict: Verdict.FAIL,
    outcome: 'rejected',
    results: {},
    rulesExecuted: [{ ruleId: 'ADR-0002', engine: 'native' } as never],
    policiesApplied: [],
    gaps: [],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    confidence: 0.9,
    rationale: 'test',
    versions: { core: '1.2.3' },
    evaluatedAt: '2026-07-15T00:00:00.000Z',
    correlationId: 'corr-1',
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    ...overrides,
  };
}

const adrGap = (o: Partial<GapFinding> = {}): GapFinding => ({
  id: 'g1',
  requirementRef: 'ADR-0002',
  severity: 'error',
  message: 'domain imports infrastructure',
  location: 'src/packages/core-domain/src/domain/a.ts:12:3',
  ...o,
});

const codeowners = parseCodeowners(
  ['*  @org/default', '/src/packages/core-domain/  @org/core-team @arch-lead'].join('\n'),
);

describe('evaluateDriftGate (GT-518 · EAG-13 — AC1 block + cite ADR/owner)', () => {
  it('blocks a violating result with exit code + ADR + owner citation', () => {
    const decision = evaluateDriftGate({ result: makeResult({ gaps: [adrGap()] }), codeowners });
    expect(decision.blocked).toBe(true);
    expect(decision.exitCode).toBe(DRIFT_GATE_BLOCK_EXIT_CODE);
    expect(decision.citations).toHaveLength(1);
    const c = decision.citations[0];
    expect(c.ref).toBe('ADR-0002');
    expect(c.isAdr).toBe(true);
    expect(c.owner).toBe('@org/core-team @arch-lead');
    expect(decision.prCommentBody).toContain('ADR-0002');
    expect(decision.prCommentBody).toContain('@org/core-team');
    expect(decision.prCommentBody).toContain('Blocked');
  });

  it('passes (exit 0, no-block comment) when there are no error findings', () => {
    const decision = evaluateDriftGate({ result: makeResult({ gaps: [], overallVerdict: Verdict.PASS }) });
    expect(decision.blocked).toBe(false);
    expect(decision.exitCode).toBe(DRIFT_GATE_PASS_EXIT_CODE);
    expect(decision.prCommentBody).toContain('No blocking architecture violations');
  });

  it('a warning finding never blocks', () => {
    const decision = evaluateDriftGate({ result: makeResult({ gaps: [adrGap({ severity: 'warning' })] }) });
    expect(decision.blocked).toBe(false);
  });

  it('the evidence manifest carries EVD-01..03 fields (id/source/status/blockingFailures)', () => {
    const { evidence } = evaluateDriftGate({ result: makeResult({ gaps: [adrGap()] }), codeowners });
    expect(evidence.id).toContain('drift-gate');
    expect(evidence.status).toBe('fail');
    expect(evidence.blockingFailures).toBe(1);
    expect(evidence.relatedRuleIds).toContain('ADR-0002');
  });
});

describe('evaluateDriftGate — waiver suppression (AC3)', () => {
  const result = makeResult({ gaps: [adrGap()] });
  // Fingerprint the drift gate will compute for the single violation.
  const fp = evaluationResultToViolations(result, 'drift-gate')[0].fingerprint;
  const approved = approveWaiver(
    requestWaiver({
      waiverRef: 'W-42',
      fingerprint: fp,
      reason: 'temporary',
      requestedBy: 'alice',
      requestedAt: '2026-07-01T00:00:00.000Z',
      expiresAt: '2026-08-01T00:00:00.000Z',
    }),
    'bob',
    '2026-07-02T00:00:00.000Z',
  );

  it('a valid waiver suppresses the finding → gate passes, evidence non-blocking', () => {
    const store = new InMemoryWaiverStore([approved]);
    const decision = evaluateDriftGate({ result, codeowners, waivers: store, now: '2026-07-15T00:00:00.000Z' });
    expect(decision.blocked).toBe(false);
    expect(decision.exitCode).toBe(DRIFT_GATE_PASS_EXIT_CODE);
    expect(decision.waived).toHaveLength(1);
    expect(decision.waived[0].waiverRef).toBe('W-42');
    expect(decision.evidence.blockingFailures).toBe(0);
    expect(decision.evidence.waiverRef).toBe('W-42');
    expect(decision.prCommentBody).toContain('Waived findings');
  });

  it('an EXPIRED waiver does NOT suppress → gate blocks again', () => {
    const store = new InMemoryWaiverStore([approved]);
    const decision = evaluateDriftGate({ result, codeowners, waivers: store, now: '2026-08-02T00:00:00.000Z' });
    expect(decision.blocked).toBe(true);
    expect(decision.exitCode).toBe(DRIFT_GATE_BLOCK_EXIT_CODE);
    expect(decision.waived).toHaveLength(0);
  });

  // GT-677 — the NEGATIVES. `applyWaivers` passed its green path for months while the
  // product suppressed nothing, so only these prove the gate consults waiver STATE and
  // not merely the presence of a record.
  it('T1 · a requested-but-unapproved waiver does NOT suppress', () => {
    const store = new InMemoryWaiverStore([
      requestWaiver({
        waiverRef: 'W-42',
        fingerprint: fp,
        reason: 'pending review',
        requestedBy: 'alice',
        requestedAt: '2026-07-01T00:00:00.000Z',
        expiresAt: '2026-08-01T00:00:00.000Z',
      }),
    ]);
    const decision = evaluateDriftGate({ result, codeowners, waivers: store, now: '2026-07-15T00:00:00.000Z' });
    expect(decision.blocked).toBe(true);
    expect(decision.waived).toHaveLength(0);
    expect(decision.evidence.blockingFailures).toBe(1);
  });

  it('T2 · a rejected waiver does NOT suppress', () => {
    const store = new InMemoryWaiverStore([
      rejectWaiver(
        requestWaiver({
          waiverRef: 'W-42',
          fingerprint: fp,
          reason: 'denied by the owner',
          requestedBy: 'alice',
          requestedAt: '2026-07-01T00:00:00.000Z',
          expiresAt: '2026-08-01T00:00:00.000Z',
        }),
      ),
    ]);
    const decision = evaluateDriftGate({ result, codeowners, waivers: store, now: '2026-07-15T00:00:00.000Z' });
    expect(decision.blocked).toBe(true);
    expect(decision.waived).toHaveLength(0);
    expect(decision.evidence.blockingFailures).toBe(1);
  });

  it('T3 · an approved waiver whose fingerprint does not match does NOT suppress, and is REPORTED as unmatched', () => {
    const store = new InMemoryWaiverStore([
      approveWaiver(
        requestWaiver({
          waiverRef: 'W-42',
          // A mistyped/stale fingerprint. Before GT-677 this was indistinguishable from
          // "not approved yet": both were a silent no-op.
          fingerprint: 'deadbeefdeadbeef',
          reason: 'typo in the fingerprint',
          requestedBy: 'alice',
          requestedAt: '2026-07-01T00:00:00.000Z',
          expiresAt: '2026-08-01T00:00:00.000Z',
        }),
        'bob',
        '2026-07-02T00:00:00.000Z',
      ),
    ]);
    const decision = evaluateDriftGate({ result, codeowners, waivers: store, now: '2026-07-15T00:00:00.000Z' });
    expect(decision.blocked).toBe(true);
    expect(decision.waived).toHaveLength(0);
    expect(decision.evidence.blockingFailures).toBe(1);
    expect(decision.unmatchedWaivers).toContain('W-42');
    expect(decision.prCommentBody).toContain('matched no finding');
  });

  it('T4 · the PR comment prints the fingerprint the waiver command needs', () => {
    const decision = evaluateDriftGate({ result, codeowners });
    const match = /\[fp `([0-9a-f]{16})`\]/.exec(decision.prCommentBody);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(fp);
  });
});

describe('PrCommentFallbackPublisher (deploy-gate-free fallback)', () => {
  it('never no-ops: a blocked decision yields failure conclusion + non-zero exit', async () => {
    const decision = evaluateDriftGate({ result: makeResult({ gaps: [adrGap()] }), codeowners });
    const published = await new PrCommentFallbackPublisher().publish(decision);
    expect(published.channel).toBe('pr-comment-fallback');
    expect(published.conclusion).toBe('failure');
    expect(published.exitCode).toBe(DRIFT_GATE_BLOCK_EXIT_CODE);
    expect(published.body).toContain('ADR-0002');
  });

  it('a passing decision yields success + exit 0', async () => {
    const decision = evaluateDriftGate({ result: makeResult({ gaps: [], overallVerdict: Verdict.PASS }) });
    const published = await new PrCommentFallbackPublisher().publish(decision);
    expect(published.conclusion).toBe('success');
    expect(published.exitCode).toBe(DRIFT_GATE_PASS_EXIT_CODE);
  });
});
