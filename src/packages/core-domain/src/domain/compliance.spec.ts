import {
  DEFAULT_COMPLIANCE_CATALOG,
  DEFAULT_COMPLIANCE_MAPPING,
  enrichViolationsWithCompliance,
  lookupControls,
  resolveComplianceControlIds,
  type ComplianceMapping,
} from './compliance';
import { buildEnforcerEvidence, makeViolation, type Violation } from './violation';

const base = { tool: 'NetArchTest', file: '', line: undefined, column: undefined, severity: 'error' as const, message: 'x' };

describe('resolveComplianceControlIds (GT-525 — ref → control ids)', () => {
  it('maps an ADR ref to its controls (sorted, de-duplicated)', () => {
    expect(resolveComplianceControlIds({ adrRef: 'ADR-0002' })).toEqual(['ISO27001-A.14.2.5', 'SOC2-CC8.1']);
  });

  it('unions ADR + rule-id mappings and de-dupes', () => {
    const mapping: ComplianceMapping = {
      version: '1.0.0',
      byAdr: { 'ADR-0002': ['SOC2-CC8.1'] },
      byRuleId: { 'HXA-01': ['SOC2-CC8.1', 'EU-AI-Act-Art.15'] },
    };
    expect(resolveComplianceControlIds({ adrRef: 'ADR-0002', ruleId: 'HXA-01' }, mapping)).toEqual([
      'EU-AI-Act-Art.15',
      'SOC2-CC8.1',
    ]);
  });

  it('returns [] for an unmapped ref (never fabricates a control)', () => {
    expect(resolveComplianceControlIds({ adrRef: 'ADR-9999' })).toEqual([]);
    expect(resolveComplianceControlIds({})).toEqual([]);
  });
});

describe('lookupControls', () => {
  it('resolves ids to full controls and drops unknown ids (fail-open)', () => {
    const controls = lookupControls(['SOC2-CC8.1', 'NOPE-1'], DEFAULT_COMPLIANCE_CATALOG);
    expect(controls).toHaveLength(1);
    expect(controls[0]).toMatchObject({ id: 'SOC2-CC8.1', framework: 'SOC2' });
  });

  it('the default catalog is versioned', () => {
    expect(DEFAULT_COMPLIANCE_CATALOG.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DEFAULT_COMPLIANCE_MAPPING.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('enrichViolationsWithCompliance', () => {
  it('attaches complianceControls to a violation whose ADR is mapped, leaving the fingerprint intact', () => {
    const v = makeViolation({ ...base, ruleId: 'HXA-01', adrRef: 'ADR-0002' });
    const [enriched] = enrichViolationsWithCompliance([v]);
    expect(enriched.complianceControls).toEqual(['ISO27001-A.14.2.5', 'SOC2-CC8.1']);
    expect(enriched.fingerprint).toBe(v.fingerprint); // enrichment is not identity
  });

  it('leaves an unmapped violation untouched (no empty array)', () => {
    const v = makeViolation({ ...base, ruleId: 'DOC-01' });
    const [out] = enrichViolationsWithCompliance([v]);
    expect(out.complianceControls).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const v = makeViolation({ ...base, ruleId: 'HXA-01', adrRef: 'ADR-0002' });
    enrichViolationsWithCompliance([v]);
    expect(v.complianceControls).toBeUndefined();
  });
});

describe('buildEnforcerEvidence aggregates compliance controls (GT-525)', () => {
  const minimal = () => ({
    id: 'evd-1', source: 'enforcer', sourceRef: 'sha', generatedAt: '2026-07-12T00:00:00Z', producer: 'evolith',
  });

  it('emits the distinct union of the violations’ controls in the manifest', () => {
    const violations: Violation[] = enrichViolationsWithCompliance([
      makeViolation({ ...base, ruleId: 'HXA-01', adrRef: 'ADR-0002' }),
      makeViolation({ ...base, ruleId: 'HXA-02', adrRef: 'ADR-0002' }),
    ]);
    const manifest = buildEnforcerEvidence({ ...minimal(), violations });
    expect(manifest.complianceControls).toEqual(['ISO27001-A.14.2.5', 'SOC2-CC8.1']);
  });

  it('omits the field entirely when no violation is enriched', () => {
    const manifest = buildEnforcerEvidence({ ...minimal(), violations: [makeViolation({ ...base, ruleId: 'DOC-01' })] });
    expect(manifest.complianceControls).toBeUndefined();
  });
});
