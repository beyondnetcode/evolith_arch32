import type {
  EvaluationResult,
  GapFinding,
  RiskFinding,
  RuleExecutionRef,
} from './contracts/evaluation-result';
import { EVALUATION_RESULT_SCHEMA_VERSION } from './contracts/evaluation-result';
import { Verdict } from '../domain/verdict/verdict';
import { ENFORCER_EVIDENCE_EVD_COVERAGE } from './violation';
import { ingestSarif, type SarifLog as IngesterSarifLog } from '../application/validators/enforcement/sarif-ingester';
import {
  emitEvaluationEvidence,
  exportEvaluationResultToSarif,
  parseFindingLocation,
  SARIF_SCHEMA_URI,
  type SarifResult,
} from './sarif-exporter';

/** Minimal EvaluationResult factory — only the fields the exporter reads matter. */
function makeResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    overallVerdict: Verdict.PASS,
    outcome: 'approved',
    results: {},
    rulesExecuted: [],
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
    evaluatedAt: '2026-07-12T00:00:00.000Z',
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    ...overrides,
  };
}

const gap = (o: Partial<GapFinding> = {}): GapFinding => ({
  id: 'g1',
  requirementRef: 'ADR-0002',
  severity: 'error',
  message: 'boundary violated',
  ...o,
});

const risk = (o: Partial<RiskFinding> = {}): RiskFinding => ({
  id: 'r1',
  level: 'high',
  category: 'architecture',
  message: 'risky dependency',
  ...o,
});

describe('exportEvaluationResultToSarif (GT-518 · EAG-13 — AC2 valid SARIF 2.1.0)', () => {
  it('emits a valid SARIF 2.1.0 log: version, $schema, one run, driver name, results array', () => {
    const log = exportEvaluationResultToSarif(makeResult({ gaps: [gap()] }));
    expect(log.version).toBe('2.1.0');
    expect(log.$schema).toBe(SARIF_SCHEMA_URI);
    expect(log.runs).toHaveLength(1);
    expect(log.runs[0].tool.driver.name).toBe('evolith-core');
    expect(Array.isArray(log.runs[0].results)).toBe(true);
  });

  it('defaults toolVersion to result.versions.core and honours opts overrides', () => {
    const def = exportEvaluationResultToSarif(makeResult());
    expect(def.runs[0].tool.driver.version).toBe('1.2.3');

    const custom = exportEvaluationResultToSarif(makeResult(), { toolName: 'my-scanner', toolVersion: '9.9.9' });
    expect(custom.runs[0].tool.driver.name).toBe('my-scanner');
    expect(custom.runs[0].tool.driver.version).toBe('9.9.9');
  });

  it('maps a GapFinding with location "src/a.ts:12:3" to a full physicalLocation', () => {
    const log = exportEvaluationResultToSarif(makeResult({ gaps: [gap({ location: 'src/a.ts:12:3' })] }));
    const res = log.runs[0].results[0];
    expect(res.ruleId).toBe('ADR-0002');
    expect(res.level).toBe('error');
    expect(res.message.text).toBe('boundary violated');
    const phys = res.locations?.[0].physicalLocation;
    expect(phys?.artifactLocation.uri).toBe('src/a.ts');
    expect(phys?.region?.startLine).toBe(12);
    expect(phys?.region?.startColumn).toBe(3);
  });

  it('maps a location with a line but no column (region has startLine, no startColumn)', () => {
    const log = exportEvaluationResultToSarif(makeResult({ gaps: [gap({ location: 'src/b.ts:7' })] }));
    const region = log.runs[0].results[0].locations?.[0].physicalLocation.region;
    expect(region?.startLine).toBe(7);
    expect(region?.startColumn).toBeUndefined();
  });

  it('maps GapFinding severities error/warning/info → error/warning/note', () => {
    const log = exportEvaluationResultToSarif(
      makeResult({
        gaps: [
          gap({ id: 'a', requirementRef: 'RA', severity: 'error' }),
          gap({ id: 'b', requirementRef: 'RB', severity: 'warning' }),
          gap({ id: 'c', requirementRef: 'RC', severity: 'info' }),
        ],
      }),
    );
    expect(log.runs[0].results.map((r: SarifResult) => r.level)).toEqual(['error', 'warning', 'note']);
  });

  it('maps RiskFinding levels critical/high → error, medium → warning, low → note', () => {
    const log = exportEvaluationResultToSarif(
      makeResult({
        risks: [
          risk({ id: 'r-crit', ruleRef: 'RC', level: 'critical' }),
          risk({ id: 'r-high', ruleRef: 'RH', level: 'high' }),
          risk({ id: 'r-med', ruleRef: 'RM', level: 'medium' }),
          risk({ id: 'r-low', ruleRef: 'RL', level: 'low' }),
        ],
      }),
    );
    expect(log.runs[0].results.map((r: SarifResult) => r.level)).toEqual(['error', 'error', 'warning', 'note']);
  });

  it('uses ruleRef for a risk ruleId, falling back to id when ruleRef is absent', () => {
    const log = exportEvaluationResultToSarif(
      makeResult({ risks: [risk({ id: 'r-fallback', ruleRef: undefined })] }),
    );
    expect(log.runs[0].results[0].ruleId).toBe('r-fallback');
  });

  it('a finding with no location produces a result with NO locations (no region, no crash)', () => {
    const log = exportEvaluationResultToSarif(makeResult({ gaps: [gap({ location: undefined })] }));
    const res = log.runs[0].results[0];
    expect(res.ruleId).toBe('ADR-0002');
    expect(res.locations).toBeUndefined();
  });

  it('lists the distinct rule ids under tool.driver.rules (sorted, deduped) for traceability', () => {
    const log = exportEvaluationResultToSarif(
      makeResult({
        gaps: [gap({ id: 'a', requirementRef: 'ADR-0002' }), gap({ id: 'b', requirementRef: 'ADR-0002' })],
        risks: [risk({ id: 'r', ruleRef: 'HXA-01' })],
      }),
    );
    expect(log.runs[0].tool.driver.rules.map((d) => d.id)).toEqual(['ADR-0002', 'HXA-01']);
  });

  it('an empty result yields runs[0].results === [] and empty rules', () => {
    const log = exportEvaluationResultToSarif(makeResult());
    expect(log.runs[0].results).toEqual([]);
    expect(log.runs[0].tool.driver.rules).toEqual([]);
  });

  it('round-trips through the SARIF ingester in spirit (uri/line/col/ruleId survive)', () => {
    const log = exportEvaluationResultToSarif(makeResult({ gaps: [gap({ requirementRef: 'no-circular', location: 'src/a.ts:12:3' })] }));
    const back = ingestSarif(log as unknown as IngesterSarifLog);
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ ruleId: 'no-circular', file: 'src/a.ts', line: 12, column: 3, severity: 'error' });
  });
});

describe('parseFindingLocation', () => {
  it('parses file, line and column variants and keeps non-numeric colons in the uri', () => {
    expect(parseFindingLocation('src/a.ts:12:3')).toEqual({ uri: 'src/a.ts', startLine: 12, startColumn: 3 });
    expect(parseFindingLocation('src/a.ts:12')).toEqual({ uri: 'src/a.ts', startLine: 12, startColumn: undefined });
    expect(parseFindingLocation('src/a.ts')).toEqual({ uri: 'src/a.ts', startLine: undefined, startColumn: undefined });
    expect(parseFindingLocation('a:b.ts')).toEqual({ uri: 'a:b.ts', startLine: undefined, startColumn: undefined });
    expect(parseFindingLocation(undefined)).toBeUndefined();
    expect(parseFindingLocation('')).toBeUndefined();
  });
});

describe('emitEvaluationEvidence (GT-518 · EAG-13 — AC2 evidence EVD-01..03)', () => {
  it('returns a manifest carrying every EVD-01..03 field defined by the coverage map', () => {
    const manifest = emitEvaluationEvidence(
      makeResult({
        gaps: [gap({ requirementRef: 'ADR-0002', location: 'src/a.ts:1:1' })],
        rulesExecuted: [{ ruleId: 'ADR-0002', engine: 'native', verdict: Verdict.FAIL } as RuleExecutionRef],
      }),
      'evaluation-result',
    );
    const record = manifest as unknown as Record<string, unknown>;
    for (const evd of ['EVD-01', 'EVD-02', 'EVD-03'] as const) {
      for (const field of ENFORCER_EVIDENCE_EVD_COVERAGE[evd]) {
        expect(record[field]).toBeDefined();
      }
    }
    expect(manifest.source).toBe('evaluation-result');
    expect(manifest.generatedAt).toBe('2026-07-12T00:00:00.000Z'); // from result.evaluatedAt
    expect(manifest.producer).toBe('evolith-core');
    expect(manifest.relatedRuleIds).toContain('ADR-0002');
  });

  it('derives status=fail and blockingFailures from error gaps (non-frozen errors block)', () => {
    const manifest = emitEvaluationEvidence(
      makeResult({ gaps: [gap({ id: 'a', requirementRef: 'RA', severity: 'error' }), gap({ id: 'b', requirementRef: 'RB', severity: 'warning' })] }),
      'gate-drift',
    );
    expect(manifest.blockingFailures).toBe(1);
    expect(manifest.status).toBe('fail');
    expect(manifest.violations).toHaveLength(2);
  });

  it('derives status=warn when only warning gaps remain and pass when none', () => {
    const warn = emitEvaluationEvidence(makeResult({ gaps: [gap({ severity: 'warning' })] }), 's');
    expect(warn.status).toBe('warn');
    expect(warn.blockingFailures).toBe(0);

    const pass = emitEvaluationEvidence(makeResult({ gaps: [] }), 's');
    expect(pass.status).toBe('pass');
    expect(pass.blockingFailures).toBe(0);
  });

  it('uses rulesExecuted for evaluatedRules and correlationId for sourceRef when present', () => {
    const manifest = emitEvaluationEvidence(
      makeResult({
        correlationId: 'corr-42',
        rulesExecuted: [
          { ruleId: 'R2', engine: 'native', verdict: Verdict.PASS } as RuleExecutionRef,
          { ruleId: 'R1', engine: 'opa', verdict: Verdict.PASS } as RuleExecutionRef,
        ],
      }),
      'evaluation-result',
    );
    expect(manifest.evaluatedRules).toEqual(['R1', 'R2']); // deduped + sorted
    expect(manifest.sourceRef).toBe('corr-42');
    expect(manifest.id).toBe('evidence:evaluation-result:corr-42');
  });

  it('converts each GapFinding to a Violation (ruleId = requirementRef, location parsed)', () => {
    const manifest = emitEvaluationEvidence(
      makeResult({ gaps: [gap({ requirementRef: 'HXA-01', location: 'src/x.ts:9:2', message: 'msg' })] }),
      'src',
    );
    expect(manifest.violations[0]).toMatchObject({
      ruleId: 'HXA-01',
      file: 'src/x.ts',
      line: 9,
      column: 2,
      severity: 'error',
      message: 'msg',
    });
    expect(manifest.violations[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});
