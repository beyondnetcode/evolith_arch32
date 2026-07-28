import * as fs from 'fs';
import * as path from 'path';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { Verdict } from '../../domain/verdict/verdict';
import type { EvaluationContext } from './evaluation-context';
import type { EvaluationResult } from './evaluation-result';

// GT-377 AC-1: the Contract Schema Registry — evaluation-context.schema.json /
// evaluation-result.schema.json must exist and round-trip-validate the canonical
// contracts; schemaVersion mandatory on the result; DecisionRecommendation.binding
// must be the literal false.
const SCHEMA_DIR = path.resolve(__dirname, '..', '..', '..', '..', '..', 'rulesets', 'schema');

function compile(file: string): ValidateFunction {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf-8'));
  return ajv.compile(schema);
}

describe('Contract Schema Registry (GT-377 AC-1)', () => {
  let validateContext: ValidateFunction;
  let validateResult: ValidateFunction;

  beforeAll(() => {
    validateContext = compile('evaluation-context.schema.json');
    validateResult = compile('evaluation-result.schema.json');
  });

  it('both schema files exist on disk', () => {
    expect(fs.existsSync(path.join(SCHEMA_DIR, 'evaluation-context.schema.json'))).toBe(true);
    expect(fs.existsSync(path.join(SCHEMA_DIR, 'evaluation-result.schema.json'))).toBe(true);
  });

  it('validates a canonical EvaluationContext (opaque identifiers only)', () => {
    const ctx: EvaluationContext = {
      kinds: ['gate', 'compliance'],
      tenant: { tenantId: 't-acme' },
      product: { productId: 'p-checkout' },
      initiative: { initiativeId: 'i-3ds' },
      phaseId: 'construction',
      gateId: 'g-construction',
      workspaceRef: 'ws-opaque-123',
      executionMode: 'hybrid',
      artifacts: { required: ['adr.md'], presented: [{ artifactId: 'adr.md' }] },
      evidence: [{ evidenceId: 'e1', evidenceType: 'coverage-report', producer: { actorType: 'ci', actorId: 'gh-actions' } }],
      externalReferences: [{ system: 'jira', kind: 'story', externalId: 'PROJ-1' }],
    };
    expect(validateContext(ctx)).toBe(true);
  });

  it('rejects an EvaluationContext missing the required `kinds`', () => {
    expect(validateContext({ tenant: { tenantId: 't' } })).toBe(false);
  });

  it('validates a canonical EvaluationResult with a non-binding decision recommendation', () => {
    const result: EvaluationResult = {
      overallVerdict: Verdict.PASS,
      outcome: 'approved',
      results: {
        gate: [{ gateId: 'g-construction', phaseId: 'construction', verdict: Verdict.PASS, artifactResults: [], risks: [], gaps: [], requiredActions: [] }],
      },
      rulesExecuted: [{ ruleId: 'GOV-001', engine: 'opa', verdict: Verdict.PASS }],
      policiesApplied: [],
      gaps: [],
      risks: [],
      missingEvidence: [],
      incompleteArtifacts: [],
      recommendations: [],
      requiredActions: [],
      decisionRecommendation: {
        subjectType: 'gate', subjectRef: 'g-construction', recommendedVerdict: Verdict.PASS,
        binding: false, recommendedBy: 'evolith-core',
      },
      confidence: 0.9,
      rationale: 'all required artifacts present and compliant',
      versions: { core: '1.0.5' },
      evaluatedAt: '2026-06-29T00:00:00.000Z',
      schemaVersion: '1.0.0',
    };
    expect(validateResult(result)).toBe(true);
  });

  it('rejects an EvaluationResult missing the mandatory `schemaVersion`', () => {
    const result: Record<string, unknown> = {
      overallVerdict: 'PASS', outcome: 'approved', results: {}, rulesExecuted: [], policiesApplied: [],
      gaps: [], risks: [], missingEvidence: [], incompleteArtifacts: [], recommendations: [], requiredActions: [],
      confidence: 1, rationale: 'ok', versions: { core: '1.0.5' }, evaluatedAt: '2026-06-29T00:00:00.000Z',
    };
    expect(validateResult(result)).toBe(false);
  });

  describe('attribution is additive (GT-586)', () => {
    const requester = {
      actorType: 'agent' as const,
      actorId: 'winston',
      modelRef: 'claude-opus-5',
      sessionId: 'sess-77',
    };
    const repositoryRevision = { revision: '9f3c1ab', branch: 'main', dirty: false };

    it('validates a context carrying a typed requester and a repository revision', () => {
      const ctx: EvaluationContext = {
        kinds: ['gate'],
        workspaceRef: 'ws-opaque-123',
        requester,
        repositoryRevision,
      };
      expect(validateContext(ctx)).toBe(true);
    });

    it('validates a result echoing both fields', () => {
      const result: EvaluationResult = {
        overallVerdict: Verdict.PASS, outcome: 'approved', results: {},
        rulesExecuted: [], policiesApplied: [], gaps: [], risks: [], missingEvidence: [],
        incompleteArtifacts: [], recommendations: [], requiredActions: [],
        confidence: 1, rationale: 'ok', versions: { core: '1.0.5' },
        requester, repositoryRevision,
        evaluatedAt: '2026-07-28T00:00:00.000Z', schemaVersion: '1.0.0',
      };
      expect(validateResult(result)).toBe(true);
    });

    it('still validates a verdict WITHOUT them — proving the change is additive', () => {
      const result: EvaluationResult = {
        overallVerdict: Verdict.PASS, outcome: 'approved', results: {},
        rulesExecuted: [], policiesApplied: [], gaps: [], risks: [], missingEvidence: [],
        incompleteArtifacts: [], recommendations: [], requiredActions: [],
        confidence: 1, rationale: 'ok', versions: { core: '1.0.5' },
        evaluatedAt: '2026-07-28T00:00:00.000Z', schemaVersion: '1.0.0',
      };
      expect(validateResult(result)).toBe(true);
      expect(validateContext({ kinds: ['gate'], workspaceRef: 'ws-1' })).toBe(true);
    });
  });

  it('rejects a DecisionRecommendation whose `binding` is not the literal false', () => {
    const result: Record<string, unknown> = {
      overallVerdict: 'PASS', outcome: 'approved', results: {}, rulesExecuted: [], policiesApplied: [],
      gaps: [], risks: [], missingEvidence: [], incompleteArtifacts: [], recommendations: [], requiredActions: [],
      decisionRecommendation: {
        subjectType: 'gate', subjectRef: 'g1', recommendedVerdict: 'PASS', binding: true, recommendedBy: 'evolith-core',
      },
      confidence: 1, rationale: 'ok', versions: { core: '1.0.5' }, evaluatedAt: '2026-06-29T00:00:00.000Z', schemaVersion: '1.0.0',
    };
    expect(validateResult(result)).toBe(false);
  });
});
