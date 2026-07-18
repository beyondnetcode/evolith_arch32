import {
  DISPOSITION_TO_SEVERITY,
  OBLIGATION_TO_SEVERITY,
  findingFromEvidenceFinding,
  findingFromGapFinding,
  findingFromGateViolation,
  findingFromRiskFinding,
  findingFromValidationIssue,
  findingFromViolation,
  findingsFromEvidence,
  isFactual,
  parseFindingLocation,
  type Finding,
  type FindingOrigin,
  type ValidationIssueLike,
} from './finding';
import type { EvidenceFinding, Provenance } from './quality-evidence';
import type { GapFinding, RiskFinding } from './evaluation-result';
import type { GateViolation } from '../../domain/gate-evidence';
import { makeViolation, type Violation } from '../../domain/violation';
import type { ValidationIssue } from '../../application/validators/ruleset-validator.types';

describe('canonical Finding model', () => {
  const provenance: Provenance = {
    collectedBy: 'dependency-cruiser',
    adapterVersion: '16.0.0',
    artifactHash: 'sha256:abc',
    timestamp: '2026-07-17T00:00:00.000Z',
  };
  const deterministic: FindingOrigin = { provenance, determinism: 'deterministic' };
  const probabilistic: FindingOrigin = { provenance, determinism: 'probabilistic' };

  /**
   * The spec is the seam that keeps the domain-local `ValidationIssueLike` honest.
   * `finding.ts` cannot import the real `ValidationIssue` (that would invert the
   * domain→application layering), so assignability is asserted HERE: if the real
   * interface gains a required field or narrows a type, this stops compiling.
   */
  it('keeps ValidationIssueLike structurally compatible with the real ValidationIssue', () => {
    const real: ValidationIssue = {
      ruleId: 'HXA-01',
      severity: 'MUST',
      category: 'architecture',
      title: 'Layering violated',
      description: 'domain imports application',
      blocking: true,
    };
    const asLike: ValidationIssueLike = real;
    expect(asLike.ruleId).toBe('HXA-01');
  });

  describe('provenance and determinism are mandatory by construction', () => {
    it('stamps the supplied provenance on every mapped finding', () => {
      const f = findingFromGateViolation(
        { ruleId: 'R1', severity: 'error', location: 'src/a.ts', message: 'boom' },
        deterministic,
      );
      expect(f.provenance).toEqual(provenance);
    });

    it('never infers determinism — a probabilistic origin stays probabilistic', () => {
      const f = findingFromRiskFinding(
        { id: 'r1', level: 'high', category: 'security', message: 'maybe injectable' },
        probabilistic,
      );
      expect(f.determinism).toBe('probabilistic');
      // A probabilistic finding must never be presentable as a fact.
      expect(isFactual(f)).toBe(false);
    });

    it('marks a deterministic finding as factual', () => {
      const f = findingFromGapFinding(
        { id: 'g1', requirementRef: 'ADR-0101', severity: 'error', message: 'missing' },
        deterministic,
      );
      expect(isFactual(f)).toBe(true);
    });
  });

  describe('advisory by construction', () => {
    const all: Finding[] = [
      findingFromEvidenceFinding({ code: 'c', severity: 'high', message: 'm' }, deterministic),
      findingFromRiskFinding({ id: 'r', level: 'critical', category: 'sec', message: 'm' }, deterministic),
      findingFromGapFinding({ id: 'g', requirementRef: 'REQ-1', severity: 'error', message: 'm' }, deterministic),
      findingFromGateViolation({ ruleId: 'R', severity: 'error', location: 'a.ts', message: 'm' }, deterministic),
      findingFromValidationIssue(
        { ruleId: 'V', severity: 'MUST', category: 'c', title: 't', description: 'm', blocking: true },
        deterministic,
      ),
      findingFromViolation(
        makeViolation({ ruleId: 'X', tool: 'dependency-cruiser', file: 'a.ts', severity: 'error', message: 'm' }),
        deterministic,
      ),
    ];

    it('flags every mapped finding as advisory regardless of source authority', () => {
      for (const f of all) expect(f.advisory).toBe(true);
    });

    it('exposes no field that decides an outcome', () => {
      // Blocking authority belongs to the Tracker's gate. A canonical finding must
      // not carry a decision-shaped key even when its source did.
      for (const f of all) {
        expect(f).not.toHaveProperty('blocking');
        expect(f).not.toHaveProperty('verdict');
        expect(f).not.toHaveProperty('outcome');
      }
    });
  });

  describe('severity reconciliation', () => {
    it('maps disposition vocabularies to magnitude bands without inflating to critical', () => {
      // `error` means "blocks" in a 2/3-level producer, not "worst possible". A
      // producer with no `critical` token can never be promoted into that band.
      expect(DISPOSITION_TO_SEVERITY).toEqual({ error: 'high', warning: 'medium', info: 'info' });
    });

    it('maps obligation levels so an unmet COULD is a small shortfall, not mere info', () => {
      expect(OBLIGATION_TO_SEVERITY).toEqual({ MUST: 'high', SHOULD: 'medium', COULD: 'low' });
    });

    it('passes EvidenceFinding severity through by identity (already canonical)', () => {
      for (const severity of ['info', 'low', 'medium', 'high', 'critical'] as const) {
        const f = findingFromEvidenceFinding({ code: 'c', severity, message: 'm' }, deterministic);
        expect(f.severity).toBe(severity);
      }
    });

    it('passes RiskFinding level through by identity (RiskLevel is a subset)', () => {
      for (const level of ['low', 'medium', 'high', 'critical'] as const) {
        const f = findingFromRiskFinding({ id: 'r', level, category: 'c', message: 'm' }, deterministic);
        expect(f.severity).toBe(level);
      }
    });

    it('preserves the producer token verbatim so the projection stays auditable', () => {
      const issue = findingFromValidationIssue(
        { ruleId: 'V', severity: 'SHOULD', category: 'c', title: 't', description: 'd', blocking: false },
        deterministic,
      );
      expect(issue.severity).toBe('medium');
      expect(issue.sourceSeverity).toBe('SHOULD');

      const gate = findingFromGateViolation(
        { ruleId: 'R', severity: 'warning', location: 'a.ts', message: 'm' },
        deterministic,
      );
      expect(gate.severity).toBe('medium');
      // Both projected to `medium`, but they remain distinguishable afterwards.
      expect(gate.sourceSeverity).toBe('warning');
    });
  });

  describe('parseFindingLocation', () => {
    it('recovers coordinates from the path:line:column convention', () => {
      expect(parseFindingLocation('src/a.ts:12:5')).toEqual({ path: 'src/a.ts', line: 12, column: 5 });
      expect(parseFindingLocation('src/a.ts:12')).toEqual({ path: 'src/a.ts', line: 12 });
    });

    it('keeps a non-path pointer opaque rather than guessing it is a file', () => {
      // A wrong `path` is worse than an honest `ref`.
      expect(parseFindingLocation('https://example.com/report#a11y')).toEqual({
        ref: 'https://example.com/report#a11y',
      });
      expect(parseFindingLocation('div.header > a')).toEqual({ ref: 'div.header > a' });
    });

    it('returns undefined for an absent or blank pointer', () => {
      expect(parseFindingLocation(undefined)).toBeUndefined();
      expect(parseFindingLocation('   ')).toBeUndefined();
    });
  });

  describe('findingFromViolation (the richest source — expected to be lossless)', () => {
    const violation: Violation = makeViolation({
      ruleId: 'HXA-01',
      tool: 'dependency-cruiser',
      file: 'src/domain/a.ts',
      line: 12,
      column: 3,
      severity: 'error',
      message: 'domain imports infrastructure',
      adrRef: 'ADR-0002',
      owner: '@team-arch',
      category: 'architecture',
      complianceControls: ['SOC2-CC6.1', 'ISO-A.8.2'],
    });

    it('carries the fingerprint as canonical identity', () => {
      expect(findingFromViolation(violation, deterministic).id).toBe(violation.fingerprint);
    });

    it('keeps line and column as structured coordinates instead of flattening them', () => {
      expect(findingFromViolation(violation, deterministic).location).toEqual({
        path: 'src/domain/a.ts',
        line: 12,
        column: 3,
      });
    });

    it('unifies ruleId and adrRef into traceRefs', () => {
      expect(findingFromViolation(violation, deterministic).traceRefs).toEqual(['HXA-01', 'ADR-0002']);
    });

    it('demotes frozen to a non-authoritative attribute rather than a blocking flag', () => {
      // `frozen` is a waiver/baseline opinion; the canonical model reports it but
      // does not let it decide anything.
      const f = findingFromViolation({ ...violation, frozen: true }, deterministic);
      expect(f.attributes?.frozen).toBe(true);
      expect(f).not.toHaveProperty('blocking');
    });

    it('retains the producing tool and compliance controls as attributes', () => {
      const f = findingFromViolation(violation, deterministic);
      expect(f.attributes?.tool).toBe('dependency-cruiser');
      expect(f.attributes?.complianceControls).toBe('SOC2-CC6.1,ISO-A.8.2');
    });

    it('omits location entirely for a project-level violation with no file', () => {
      const locationless = makeViolation({
        ruleId: 'R',
        tool: 'deptrac',
        file: '',
        severity: 'warning',
        message: 'project-level',
      });
      const f = findingFromViolation(locationless, deterministic);
      expect(f).not.toHaveProperty('location');
    });

    it('leaves owner and category absent when the violation was never enriched', () => {
      const bare = makeViolation({
        ruleId: 'R',
        tool: 'deptrac',
        file: 'a.ts',
        severity: 'info',
        message: 'm',
      });
      const f = findingFromViolation(bare, deterministic);
      expect(f).not.toHaveProperty('owner');
      expect(f).not.toHaveProperty('category');
    });
  });

  describe('lossiness is explicit — a field a source cannot fill stays ABSENT', () => {
    it('leaves id absent for EvidenceFinding, which carries no identity', () => {
      const source: EvidenceFinding = { code: 'a11y-contrast', severity: 'high', message: 'low contrast' };
      const f = findingFromEvidenceFinding(source, deterministic);
      // Synthesizing an id would look stable across runs while silently churning.
      expect(f).not.toHaveProperty('id');
      expect(f.code).toBe('a11y-contrast');
    });

    it('leaves category and traceRefs absent for EvidenceFinding', () => {
      const f = findingFromEvidenceFinding({ code: 'c', severity: 'low', message: 'm' }, deterministic);
      expect(f).not.toHaveProperty('category');
      expect(f).not.toHaveProperty('traceRefs');
    });

    it('leaves location absent when EvidenceFinding reports none', () => {
      const f = findingFromEvidenceFinding({ code: 'c', severity: 'low', message: 'm' }, deterministic);
      expect(f).not.toHaveProperty('location');
    });

    it('leaves id and category absent for GateViolation, which has neither', () => {
      const source: GateViolation = {
        ruleId: 'GATE-01',
        severity: 'error',
        location: 'docs/adr',
        message: 'no ADR for the change',
      };
      const f = findingFromGateViolation(source, deterministic);
      expect(f).not.toHaveProperty('id');
      expect(f).not.toHaveProperty('category');
    });

    it('drops the gate-blocking MEANING of GateViolation severity, keeping only magnitude', () => {
      // GateViolation.severity==='error' means "blocks the gate". The canonical
      // finding is advisory, so that authority cannot survive the hop — callers
      // needing the outcome must use deriveVerdict() on the original violations.
      const f = findingFromGateViolation(
        { ruleId: 'G', severity: 'error', location: 'a.ts', message: 'm' },
        deterministic,
      );
      expect(f.severity).toBe('high');
      expect(f.sourceSeverity).toBe('error');
      expect(f).not.toHaveProperty('blocking');
    });

    it('leaves id absent for ValidationIssue, which carries no identity', () => {
      const f = findingFromValidationIssue(
        { ruleId: 'V-1', severity: 'MUST', category: 'c', title: 't', description: 'd', blocking: true },
        deterministic,
      );
      expect(f).not.toHaveProperty('id');
    });

    it('leaves title absent for every source except ValidationIssue', () => {
      // ValidationIssue is the only shape that splits a short label from the body,
      // which is the sole reason `title` exists on the canonical model.
      expect(
        findingFromGapFinding({ id: 'g', requirementRef: 'R', severity: 'info', message: 'm' }, deterministic),
      ).not.toHaveProperty('title');
      expect(
        findingFromViolation(
          makeViolation({ ruleId: 'R', tool: 't', file: 'a.ts', severity: 'info', message: 'm' }),
          deterministic,
        ),
      ).not.toHaveProperty('title');
    });

    it('leaves traceRefs absent for a RiskFinding with no ruleRef', () => {
      const source: RiskFinding = { id: 'r1', level: 'medium', category: 'compliance', message: 'm' };
      const f = findingFromRiskFinding(source, deterministic);
      expect(f).not.toHaveProperty('traceRefs');
      // With no ruleRef the risk's own id is the only code-shaped identifier left.
      expect(f.code).toBe('r1');
    });

    it('leaves owner absent for every source but Violation', () => {
      // Only the enforcer pipeline enriches ownership; nothing else knows it.
      expect(
        findingFromRiskFinding({ id: 'r', level: 'low', category: 'c', message: 'm' }, deterministic),
      ).not.toHaveProperty('owner');
      expect(
        findingFromGapFinding({ id: 'g', requirementRef: 'R', severity: 'info', message: 'm' }, deterministic),
      ).not.toHaveProperty('owner');
      expect(
        findingFromEvidenceFinding({ code: 'c', severity: 'low', message: 'm' }, deterministic),
      ).not.toHaveProperty('owner');
    });

    it('leaves attributes absent for sources with no private fields to preserve', () => {
      expect(
        findingFromEvidenceFinding({ code: 'c', severity: 'low', message: 'm' }, deterministic),
      ).not.toHaveProperty('attributes');
      expect(
        findingFromGapFinding({ id: 'g', requirementRef: 'R', severity: 'info', message: 'm' }, deterministic),
      ).not.toHaveProperty('attributes');
    });
  });

  describe('findingFromGapFinding', () => {
    it('uses requirementRef as both machine code and trace ref', () => {
      const source: GapFinding = {
        id: 'gap-1',
        requirementRef: 'ADR-0104',
        severity: 'warning',
        message: 'blueprint lacks a data concern',
        location: 'blueprints/x.yaml:4',
      };
      const f = findingFromGapFinding(source, deterministic);
      expect(f.id).toBe('gap-1');
      expect(f.code).toBe('ADR-0104');
      expect(f.traceRefs).toEqual(['ADR-0104']);
      expect(f.severity).toBe('medium');
      expect(f.location).toEqual({ path: 'blueprints/x.yaml', line: 4 });
    });
  });

  describe('findingFromValidationIssue', () => {
    const issue: ValidationIssueLike = {
      ruleId: 'HXA-02',
      severity: 'MUST',
      category: 'architecture',
      title: 'Missing port',
      description: 'the adapter has no port to implement',
      file: 'src/infra/a.ts',
      expected: 'IPort',
      actual: 'none',
      blocking: true,
    };

    it('preserves the title/description split the other five shapes do not have', () => {
      const f = findingFromValidationIssue(issue, deterministic);
      expect(f.title).toBe('Missing port');
      expect(f.message).toBe('the adapter has no port to implement');
    });

    it('parks expected/actual and blocking as uninterpreted attributes', () => {
      // `blocking` is a producer opinion, not canonical authority; expected/actual
      // are a diff, not a property of the finding.
      const f = findingFromValidationIssue(issue, deterministic);
      expect(f.attributes).toEqual({ blocking: true, expected: 'IPort', actual: 'none' });
    });

    it('omits expected/actual keys entirely when the issue reports neither', () => {
      const f = findingFromValidationIssue(
        { ruleId: 'V', severity: 'COULD', category: 'c', title: 't', description: 'd', blocking: false },
        deterministic,
      );
      expect(f.attributes).toEqual({ blocking: false });
      expect(f).not.toHaveProperty('location');
    });
  });

  describe('findingsFromEvidence', () => {
    it('propagates the parent evidence provenance and determinism to each finding', () => {
      // Evidence is the one source that already carries a mandatory origin, so the
      // caller does not have to supply one by hand.
      const findings = findingsFromEvidence({
        findings: [
          { code: 'unused-css', severity: 'low', message: 'a' },
          { code: 'a11y-contrast', severity: 'high', message: 'b' },
        ],
        determinism: 'deterministic',
        provenance: { ...provenance, collectedBy: 'lighthouse' },
        dimension: 'performance',
      });

      expect(findings).toHaveLength(2);
      for (const f of findings) {
        expect(f.provenance.collectedBy).toBe('lighthouse');
        expect(f.determinism).toBe('deterministic');
        // The dimension is the closest thing evidence has to a category, and it is
        // only known at this level — not inside the per-finding mapper.
        expect(f.category).toBe('performance');
      }
    });

    it('leaves category absent when the evidence declares no dimension', () => {
      const [f] = findingsFromEvidence({
        findings: [{ code: 'c', severity: 'info', message: 'm' }],
        determinism: 'probabilistic',
        provenance,
      });
      expect(f).not.toHaveProperty('category');
      expect(isFactual(f)).toBe(false);
    });

    it('returns an empty list for evidence with no findings', () => {
      expect(
        findingsFromEvidence({ findings: [], determinism: 'deterministic', provenance }),
      ).toEqual([]);
    });
  });
});
