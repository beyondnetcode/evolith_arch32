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

  // ---------------------------------------------------------------------------
  // GT-688 — `results.topology` object → ARRAY.
  //
  // Before this row NOTHING in this suite asserted anything about the topology
  // key, so the JSON schema and the TypeScript type were free to drift apart.
  // Both halves are asserted: the plural form validates, and the OLD singular
  // form is now REJECTED — which is what makes the 2.0.0 major bump honest.
  // ---------------------------------------------------------------------------
  describe('results.topology is a composition (GT-688)', () => {
    const topologyEntry = (topologyRef: string) => ({
      topologyRef,
      verdict: Verdict.PASS,
      conformant: true,
      gaps: [],
      recommendations: [],
    });

    const resultWithTopology = (topology: unknown): Record<string, unknown> => ({
      overallVerdict: 'PASS',
      outcome: 'approved',
      results: { topology },
      rulesExecuted: [],
      policiesApplied: [],
      gaps: [],
      risks: [],
      missingEvidence: [],
      incompleteArtifacts: [],
      recommendations: [],
      requiredActions: [],
      confidence: 1,
      rationale: 'ok',
      versions: { core: '1.0.5' },
      evaluatedAt: '2026-06-29T00:00:00.000Z',
      schemaVersion: '2.0.0',
    });

    it('validates a two-topology EvaluationResult', () => {
      const valid = validateResult(
        resultWithTopology([topologyEntry('modular-monolith'), topologyEntry('agentic-ai')]),
      );
      expect(valid).toBe(true);
    });

    it('rejects the pre-GT-688 single-object form', () => {
      expect(validateResult(resultWithTopology(topologyEntry('modular-monolith')))).toBe(false);
    });

    it('still accepts the single-element composition a scalar caller produces', () => {
      expect(validateResult(resultWithTopology([topologyEntry('modular-monolith')]))).toBe(true);
    });
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

  describe('structural fact base is additive (GT-589)', () => {
    const repoFacts = {
      schemaVersion: '1.0.0',
      contentHash: 'sha256:deadbeef',
      provenance: {
        extractedBy: 'evolith-repo-facts',
        extractorVersion: '1.0.0',
        indexer: 'typescript-compiler-api',
        indexerVersion: '6.0.3',
        extractedAt: '2026-07-30T00:00:00.000Z',
      },
      modules: [{ id: 'src/cli/a.ts', layer: 'cli' }],
      imports: [{ from: 'src/cli/a.ts', to: 'src/app/b.ts', typeOnly: false }],
      symbols: [{ id: 'src/cli/a.ts#run', name: 'run', kind: 'function', moduleId: 'src/cli/a.ts', exported: true }],
      references: [{ fromSymbol: 'src/cli/a.ts#run', toSymbol: 'src/app/b.ts#serve' }],
    };

    it('validates a context carrying inline RepoFacts and symbol boundaries', () => {
      const ctx: EvaluationContext = {
        kinds: ['architecture'],
        workspaceRef: 'ws-opaque-123',
        repoFacts,
        architecture: {
          symbolBoundaries: [
            { id: 'cli-not-infra', fromModules: ['src/cli/**'], forbiddenSymbolModules: ['src/infrastructure/**'] },
          ],
        },
      };
      expect(validateContext(ctx)).toBe(true);
    });

    it('rejects RepoFacts missing the mandatory contentHash', () => {
      const { contentHash, ...withoutHash } = repoFacts;
      expect(validateContext({ kinds: ['architecture'], repoFacts: withoutHash })).toBe(false);
    });

    it('validates an architecture result echoing the structural summary', () => {
      const result: EvaluationResult = {
        overallVerdict: Verdict.FAIL,
        outcome: 'rejected',
        results: {
          architecture: {
            verdict: Verdict.FAIL,
            risks: [],
            gaps: [],
            recommendations: [],
            structuralFacts: {
              contentHash: 'sha256:deadbeef',
              indexer: 'typescript-compiler-api',
              moduleCount: 1,
              importCount: 1,
              symbolCount: 1,
              referenceCount: 1,
              cycles: [{ chain: ['a.ts', 'b.ts', 'a.ts'], component: ['a.ts', 'b.ts'], typeOnly: false }],
              boundaryCrossings: [
                {
                  ruleId: 'cli-not-infra',
                  fromSymbol: 'src/cli/a.ts#run',
                  toSymbol: 'src/infrastructure/db.ts#pool',
                  symbolChain: ['src/cli/a.ts#run', 'src/app/b.ts#serve', 'src/infrastructure/db.ts#pool'],
                  moduleChain: ['src/cli/a.ts', 'src/app/b.ts', 'src/infrastructure/db.ts'],
                  viaLegalImportsOnly: true,
                  severity: 'error',
                },
              ],
            },
          },
        },
        rulesExecuted: [], policiesApplied: [], gaps: [], risks: [], missingEvidence: [],
        incompleteArtifacts: [], recommendations: [], requiredActions: [],
        confidence: 1, rationale: 'structural', versions: { core: '1.0.5' },
        evaluatedAt: '2026-07-30T00:00:00.000Z', schemaVersion: '1.0.0',
      };
      expect(validateResult(result)).toBe(true);
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
