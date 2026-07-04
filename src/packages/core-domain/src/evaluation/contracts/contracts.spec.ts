import {
  EVALUATION_CONTEXT_SCHEMA_VERSION,
  EVALUATION_RESULT_SCHEMA_VERSION,
  EvaluationContext,
  EvaluationResult,
  DecisionRecommendation,
} from './index';
import { Verdict } from '../../domain/verdict/verdict';

describe('Core Evaluation Engine contracts (GT-377 / ADR-0101)', () => {
  it('exposes versioned schema constants', () => {
    expect(EVALUATION_CONTEXT_SCHEMA_VERSION).toBe('1.0.0');
    expect(EVALUATION_RESULT_SCHEMA_VERSION).toBe('1.0.0');
  });

  it('accepts a context with opaque identifiers only (no Core entities)', () => {
    const ctx: EvaluationContext = {
      kinds: ['gate', 'compliance'],
      tenant: { tenantId: 't-acme' },
      product: { productId: 'p-checkout' },
      initiative: { initiativeId: 'i-3ds' },
      phaseId: 'construction',
      gateId: 'g-construction',
      workspaceRef: 'ws-opaque-123',
      executionMode: 'hybrid',
    };
    // All identifiers are plain strings (opaque context, not entities).
    expect(typeof ctx.tenant?.tenantId).toBe('string');
    expect(typeof ctx.product?.productId).toBe('string');
    expect(ctx.kinds).toContain('gate');
  });

  it('shapes a result with a non-binding decision recommendation', () => {
    const rec: DecisionRecommendation = {
      subjectType: 'gate',
      subjectRef: 'g-construction',
      recommendedVerdict: Verdict.PASS,
      binding: false,
      recommendedBy: 'evolith-core',
    };
    expect(rec.binding).toBe(false);
    expect(rec.recommendedBy).toBe('evolith-core');

    const result: EvaluationResult = {
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
      decisionRecommendation: rec,
      confidence: 0.9,
      rationale: 'all required artifacts present and compliant',
      versions: { core: '1.0.5' },
      evaluatedAt: '2026-06-28T00:00:00.000Z',
      schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    };
    expect(result.overallVerdict).toBe(Verdict.PASS);
    expect(result.decisionRecommendation?.binding).toBe(false);
  });
});
