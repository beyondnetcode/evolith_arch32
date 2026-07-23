import {
  verdictToStatus,
  mergeStatus,
  fromEvaluation,
  fromHarness,
  applyPolicy,
  assembleResult,
} from './result-assembler';
import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type { HarnessExecutionResult } from '../domain/ports/harness.port';
import type { PolicyValidationResult } from '../domain/ports/policy-validation.port';

describe('result-assembler', () => {
  describe('verdictToStatus', () => {
    it('maps PASS to passed', () => {
      expect(verdictToStatus('PASS')).toBe('passed');
    });

    it('maps FAIL to blocked', () => {
      expect(verdictToStatus('FAIL')).toBe('blocked');
    });

    it('maps WAIVE to warning', () => {
      expect(verdictToStatus('WAIVE')).toBe('warning');
    });

    it('maps SKIP to warning', () => {
      expect(verdictToStatus('SKIP')).toBe('warning');
    });

    it('maps unknown verdict to warning', () => {
      expect(verdictToStatus('UNKNOWN')).toBe('warning');
    });
  });

  describe('mergeStatus', () => {
    it('returns the higher severity status', () => {
      expect(mergeStatus('passed', 'blocked')).toBe('blocked');
      expect(mergeStatus('blocked', 'passed')).toBe('blocked');
      expect(mergeStatus('error', 'warning')).toBe('error');
      expect(mergeStatus('warning', 'passed')).toBe('warning');
    });

    it('returns first when equal', () => {
      expect(mergeStatus('passed', 'passed')).toBe('passed');
      expect(mergeStatus('error', 'error')).toBe('error');
    });
  });

  describe('fromEvaluation', () => {
    it('maps a PASS verdict with no gaps to passed status', () => {
      const result: EvaluationResult = {
        overallVerdict: 'PASS',
        gaps: [],
        risks: [],
        recommendations: [],
        missingEvidence: [],
        incompleteArtifacts: [],
      } as EvaluationResult;

      const out = fromEvaluation(result);
      expect(out.status).toBe('passed');
      expect(out.findings).toHaveLength(0);
      expect(out.missingArtifacts).toHaveLength(0);
    });

    it('maps a FAIL verdict to blocked status', () => {
      const result: EvaluationResult = {
        overallVerdict: 'FAIL',
        gaps: [{ id: 'GAP-01', severity: 'error', message: 'Missing file', requirementRef: 'R-1', location: 'src/' }],
        risks: [],
        recommendations: [],
        missingEvidence: ['readme.md'],
        incompleteArtifacts: [],
      } as EvaluationResult;

      const out = fromEvaluation(result);
      expect(out.status).toBe('blocked');
      expect(out.findings).toHaveLength(1);
      expect(out.findings[0].source).toBe('core');
      expect(out.missingArtifacts).toContain('readme.md');
    });

    it('combines gaps and risks into findings', () => {
      const result: EvaluationResult = {
        overallVerdict: 'PASS',
        gaps: [{ id: 'G-1', severity: 'warning', message: 'Minor issue' }],
        risks: [{ id: 'R-1', level: 'high', message: 'Risk found', ruleRef: 'RULE-1' }],
        recommendations: [{ id: 'REC-1', message: 'Do this', rationale: 'Because', references: [] }],
        missingEvidence: [],
        incompleteArtifacts: ['incomplete.md'],
      } as EvaluationResult;

      const out = fromEvaluation(result);
      expect(out.findings).toHaveLength(2);
      expect(out.findings[0].source).toBe('core');
      expect(out.findings[1].source).toBe('core');
      expect(out.recommendations).toHaveLength(1);
      expect(out.missingArtifacts).toContain('incomplete.md');
    });
  });

  describe('fromHarness', () => {
    it('maps ok=true to passed status', () => {
      const result: HarnessExecutionResult = {
        ok: true,
        capability: 'test',
        exitCode: 0,
        stdout: '',
        stderr: '',
      };

      const out = fromHarness(result);
      expect(out.status).toBe('passed');
    });

    it('maps ok=false to blocked status', () => {
      const result: HarnessExecutionResult = {
        ok: false,
        capability: 'test',
        exitCode: 1,
        stdout: '',
        stderr: 'error',
      };

      const out = fromHarness(result);
      expect(out.status).toBe('blocked');
    });

    it('parses findings from data.findings', () => {
      const result: HarnessExecutionResult = {
        ok: true,
        capability: 'test',
        exitCode: 0,
        data: { findings: ['Issue 1', 'Issue 2'] },
      };

      const out = fromHarness(result);
      expect(out.findings).toHaveLength(2);
      expect(out.findings[0].message).toBe('Issue 1');
      expect(out.findings[0].source).toBe('harness');
    });

    it('parses missing artifacts from data', () => {
      const result: HarnessExecutionResult = {
        ok: true,
        capability: 'test',
        exitCode: 0,
        data: { missing_artifacts: ['readme.md', 'tests/'] },
      };

      const out = fromHarness(result);
      expect(out.missingArtifacts).toEqual(['readme.md', 'tests/']);
    });
  });

  describe('applyPolicy', () => {
    it('adds OPA violations to findings', () => {
      const base = {
        status: 'passed' as const,
        findings: [],
        recommendations: [],
        missingArtifacts: [],
      };
      const policy: PolicyValidationResult = {
        allowed: true,
        policyRef: 'evolith.test',
        violations: [{ ruleId: 'POL-1', severity: 'warning', message: 'Policy issue' }],
      } as PolicyValidationResult;

      const out = applyPolicy(base, policy);
      expect(out.findings).toHaveLength(1);
      expect(out.findings[0].source).toBe('opa');
      expect(out.status).toBe('passed');
    });

    it('forces blocked when policy denies', () => {
      const base = {
        status: 'passed' as const,
        findings: [],
        recommendations: [],
        missingArtifacts: [],
      };
      const policy: PolicyValidationResult = {
        allowed: false,
        policyRef: 'evolith.test',
        violations: [{ ruleId: 'POL-1', severity: 'error', message: 'Denied' }],
      } as PolicyValidationResult;

      const out = applyPolicy(base, policy);
      expect(out.status).toBe('blocked');
      expect(out.findings).toHaveLength(1);
    });
  });

  describe('assembleResult', () => {
    it('assembles a complete result with default summary', () => {
      const out = assembleResult({
        parts: {
          status: 'passed',
          findings: [],
          recommendations: [],
          missingArtifacts: [],
        },
        trace: { correlationId: 'test-123', capability: 'test' },
        evaluatedAt: '2026-01-01T00:00:00Z',
      });

      expect(out.status).toBe('passed');
      expect(out.summary).toContain('no blocking findings');
      expect(out.trace.correlationId).toBe('test-123');
    });

    it('uses custom summary when provided', () => {
      const out = assembleResult({
        parts: {
          status: 'blocked',
          findings: [],
          recommendations: [],
          missingArtifacts: [],
        },
        trace: { correlationId: 'test', capability: 'test' },
        evaluatedAt: '2026-01-01T00:00:00Z',
        summary: 'Custom summary',
      });

      expect(out.summary).toBe('Custom summary');
    });
  });
});
