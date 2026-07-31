/**
 * GT-589 — the `architecture` evaluator answering a question no ruleset could express.
 *
 * The point of these tests is the CONTRAST: the same three modules, evaluated with
 * and without a structural fact base on the context. Without it the evaluator can
 * only repeat what the drift/import checks found (nothing — no import in this tree
 * is illegal); with it, the evaluator names a symbol the CLI boundary reaches
 * through a chain in which every single import is legal.
 */

import { createArchitectureKindEvaluator, structuralFindingsFrom } from './kind-evaluators';
import { REPO_FACTS_SCHEMA_VERSION, summarizeRepoFacts } from './contracts/repo-facts';
import type { EvaluationContext } from './contracts/evaluation-context';
import type { RepoFacts, SymbolBoundaryRule } from './contracts/repo-facts';
import { Verdict } from '../domain/verdict/verdict';

const cleanDrift = (): any => ({
  detectDrift: jest.fn(async () => ({
    detectedLevel: 'F2',
    driftDetected: false,
    driftSeverity: 'none',
    newViolations: [],
    persistentViolations: [],
  })),
});

const ws = { satellitePath: '/ws/sat', corePath: '/ws/core' };

const repoFacts: RepoFacts = {
  schemaVersion: REPO_FACTS_SCHEMA_VERSION,
  contentHash: 'sha256:abc123',
  provenance: {
    extractedBy: 'evolith-repo-facts',
    extractorVersion: '1.0.0',
    indexer: 'typescript-compiler-api',
    indexerVersion: '6.0.3',
    extractedAt: '2026-07-30T00:00:00.000Z',
  },
  modules: [
    { id: 'src/application/place-order.ts' },
    { id: 'src/cli/checkout.ts' },
    { id: 'src/infrastructure/db-pool.ts' },
  ],
  imports: [
    { from: 'src/application/place-order.ts', to: 'src/infrastructure/db-pool.ts', typeOnly: false },
    { from: 'src/cli/checkout.ts', to: 'src/application/place-order.ts', typeOnly: false },
  ],
  symbols: [
    { id: 'src/application/place-order.ts#placeOrder', name: 'placeOrder', kind: 'function', moduleId: 'src/application/place-order.ts', exported: true },
    { id: 'src/cli/checkout.ts#runCheckout', name: 'runCheckout', kind: 'function', moduleId: 'src/cli/checkout.ts', exported: true },
    { id: 'src/infrastructure/db-pool.ts#connectionPool', name: 'connectionPool', kind: 'variable', moduleId: 'src/infrastructure/db-pool.ts', exported: true },
  ],
  references: [
    { fromSymbol: 'src/application/place-order.ts#placeOrder', toSymbol: 'src/infrastructure/db-pool.ts#connectionPool' },
    { fromSymbol: 'src/cli/checkout.ts#runCheckout', toSymbol: 'src/application/place-order.ts#placeOrder' },
  ],
};

const boundary: SymbolBoundaryRule = {
  id: 'cli-must-not-reach-infrastructure',
  fromModules: ['src/cli/**'],
  forbiddenSymbolModules: ['src/infrastructure/**'],
};

const baseCtx = { kinds: ['architecture'], workspaceRef: 'ws' } as unknown as EvaluationContext;

describe('architecture evaluator + RepoFacts (GT-589)', () => {
  it('without a fact base, PASSes — no import in this tree is illegal', async () => {
    const r = await createArchitectureKindEvaluator(cleanDrift()).evaluate(baseCtx, ws);
    expect(r.verdict).toBe(Verdict.PASS);
    expect(r.gaps ?? []).toEqual([]);
    expect(r.results.architecture?.structuralFacts).toBeUndefined();
  });

  it('with the fact base, names the symbol the boundary reaches and FAILs', async () => {
    const ctx = {
      ...baseCtx,
      repoFacts,
      architecture: { symbolBoundaries: [boundary] },
    } as unknown as EvaluationContext;

    const r = await createArchitectureKindEvaluator(cleanDrift()).evaluate(ctx, ws);

    expect(r.verdict).toBe(Verdict.FAIL);
    const crossing = r.results.architecture?.structuralFacts?.boundaryCrossings[0];
    expect(crossing).toMatchObject({
      ruleId: 'cli-must-not-reach-infrastructure',
      toSymbol: 'src/infrastructure/db-pool.ts#connectionPool',
      viaLegalImportsOnly: true,
    });
    const gap = (r.gaps ?? []).find((g) => g.id.startsWith('STRUCT-SYMBOL-BOUNDARY-'));
    expect(gap?.message).toContain('src/cli/checkout.ts#runCheckout');
    expect(gap?.message).toContain('no pairwise import check can express it');
  });

  it('echoes the extractor contentHash so the verdict names the input it judged', async () => {
    const ctx = { ...baseCtx, repoFacts } as unknown as EvaluationContext;
    const r = await createArchitectureKindEvaluator(cleanDrift()).evaluate(ctx, ws);
    expect(r.results.architecture?.structuralFacts?.contentHash).toBe('sha256:abc123');
    expect(r.recommendations?.[0].message).toContain('sha256:abc123');
  });

  it('judges a repository it never saw: no workspace, facts only', async () => {
    const drift = cleanDrift();
    const ctx = {
      ...baseCtx,
      repoFacts,
      architecture: { symbolBoundaries: [boundary] },
    } as unknown as EvaluationContext;

    const r = await createArchitectureKindEvaluator(drift).evaluate(ctx, { satellitePath: '' });

    expect(drift.detectDrift).not.toHaveBeenCalled();
    expect(r.verdict).toBe(Verdict.FAIL);
    expect(r.results.architecture?.structuralFacts?.moduleCount).toBe(3);
  });

  it('SKIPs when it has neither a workspace nor facts', async () => {
    const drift = cleanDrift();
    const r = await createArchitectureKindEvaluator(drift).evaluate(baseCtx, { satellitePath: '' });
    expect(r.verdict).toBe(Verdict.SKIP);
    expect(drift.detectDrift).not.toHaveBeenCalled();
  });

  it('produces byte-identical results for the same facts, twice', async () => {
    const ctx = {
      ...baseCtx,
      repoFacts,
      architecture: { symbolBoundaries: [boundary] },
    } as unknown as EvaluationContext;
    const first = await createArchitectureKindEvaluator(cleanDrift()).evaluate(ctx, { satellitePath: '' });
    const second = await createArchitectureKindEvaluator(cleanDrift()).evaluate(ctx, { satellitePath: '' });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('degrades a type-only cycle to a warning rather than a blocking gap', () => {
    const typeOnlyCycle = summarizeRepoFacts({
      ...repoFacts,
      modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
      imports: [
        { from: 'a.ts', to: 'b.ts', typeOnly: true },
        { from: 'b.ts', to: 'a.ts', typeOnly: true },
      ],
      symbols: [],
      references: [],
    });
    const findings = structuralFindingsFrom(typeOnlyCycle);
    expect(findings.gaps.map((g) => g.severity)).toEqual(['warning']);
    expect(findings.gaps[0].message).toContain('type-only');
    expect(findings.risks[0].level).toBe('low');
  });
});
