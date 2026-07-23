import {
  parseFindingLocation,
  findingFromEvidenceFinding,
  findingFromRiskFinding,
  findingFromGapFinding,
  findingFromGateViolation,
  DISPOSITION_TO_SEVERITY,
  OBLIGATION_TO_SEVERITY,
  type FindingOrigin,
} from './finding';
import type { GateViolation } from '../gate-evidence';

const origin: FindingOrigin = {
  determinism: 'deterministic',
  provenance: { collectedBy: 'test' },
};

describe('finding', () => {
  describe('parseFindingLocation', () => {
    it('parses file:line:column format', () => {
      const loc = parseFindingLocation('src/index.ts:10:5');
      expect(loc).toEqual({ path: 'src/index.ts', line: 10, column: 5 });
    });

    it('parses file:line format', () => {
      const loc = parseFindingLocation('src/index.ts:10');
      expect(loc).toEqual({ path: 'src/index.ts', line: 10 });
    });

    it('returns ref for URLs', () => {
      const loc = parseFindingLocation('https://example.com');
      expect(loc).toEqual({ ref: 'https://example.com' });
    });

    it('returns ref for plain text', () => {
      const loc = parseFindingLocation('some reference');
      expect(loc).toEqual({ ref: 'some reference' });
    });

    it('returns undefined for empty input', () => {
      expect(parseFindingLocation(undefined)).toBeUndefined();
      expect(parseFindingLocation('')).toBeUndefined();
      expect(parseFindingLocation('  ')).toBeUndefined();
    });
  });

  describe('DISPOSITION_TO_SEVERITY', () => {
    it('maps error to high', () => {
      expect(DISPOSITION_TO_SEVERITY.error).toBe('high');
    });

    it('maps warning to medium', () => {
      expect(DISPOSITION_TO_SEVERITY.warning).toBe('medium');
    });

    it('maps info to info', () => {
      expect(DISPOSITION_TO_SEVERITY.info).toBe('info');
    });
  });

  describe('OBLIGATION_TO_SEVERITY', () => {
    it('maps MUST to high', () => {
      expect(OBLIGATION_TO_SEVERITY.MUST).toBe('high');
    });

    it('maps SHOULD to medium', () => {
      expect(OBLIGATION_TO_SEVERITY.SHOULD).toBe('medium');
    });

    it('maps COULD to low', () => {
      expect(OBLIGATION_TO_SEVERITY.COULD).toBe('low');
    });
  });

  describe('findingFromGateViolation', () => {
    it('converts gate violation to canonical finding', () => {
      const violation: GateViolation = {
        ruleId: 'PG-F1-001',
        rulePath: 'rulesets/opa/phase-gates.rego',
        artifact: 'prd.md',
        passed: false,
        message: 'PRD missing',
        severity: 'error',
        remediation: 'Create PRD',
        gateRef: 'gate-f1',
      };

      const finding = findingFromGateViolation(violation, origin);
      expect(finding.code).toBe('PG-F1-001');
      expect(finding.severity).toBe('high');
      expect(finding.message).toBe('PRD missing');
      expect(finding.advisory).toBe(true);
    });
  });

  describe('findingFromRiskFinding', () => {
    it('converts risk finding to canonical finding', () => {
      const finding = findingFromRiskFinding({
        id: 'R-1',
        level: 'critical',
        category: 'security',
        message: 'SQL injection risk',
        ruleRef: 'SEC-001',
      }, origin);

      expect(finding.id).toBe('R-1');
      expect(finding.code).toBe('SEC-001');
      expect(finding.severity).toBe('critical');
      expect(finding.traceRefs).toEqual(['SEC-001']);
    });
  });

  describe('findingFromGapFinding', () => {
    it('converts gap finding to canonical finding', () => {
      const finding = findingFromGapFinding({
        id: 'GAP-1',
        requirementRef: 'R-001',
        severity: 'error',
        message: 'Missing artifact',
      }, origin);

      expect(finding.id).toBe('GAP-1');
      expect(finding.code).toBe('R-001');
      expect(finding.severity).toBe('high');
      expect(finding.traceRefs).toEqual(['R-001']);
    });
  });
});
