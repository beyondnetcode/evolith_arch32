/**
 * GT-589 end-to-end — extract OUTSIDE the Core, evaluate INSIDE it, twice.
 *
 * This is the whole seam in one test: the extractor reads a repository (the only
 * side-effectful step, and it happens here, not in the Core), the resulting
 * content-hashed value is placed on the `EvaluationContext`, and the Core's
 * `architecture` KindEvaluator answers structural questions with NO workspace at
 * all — a repository it has never seen. Running it twice must produce byte-identical
 * output, which is the reproducibility claim stated as an assertion rather than as
 * an argument.
 */

import * as path from 'path';
import { createArchitectureKindEvaluator } from '@beyondnet/evolith-core-domain/evaluation';
import type { EvaluationContext, SymbolBoundaryRule } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import { extractTypeScriptFacts } from './typescript-fact-extractor';

const FIXTURE = path.resolve(__dirname, '..', 'test', 'fixtures', 'layered-repo');

const BOUNDARY: SymbolBoundaryRule = {
  id: 'cli-must-not-reach-infrastructure',
  fromModules: ['src/cli/**'],
  forbiddenSymbolModules: ['src/infrastructure/**'],
  description: 'The CLI surface may call the application layer, never the database pool.',
};

// The Core never runs a drift scan on this path — there is no workspace — so the
// drift dependency is a throwing stub: if the evaluator touched it, the test fails.
const forbiddenDrift: any = {
  detectDrift: () => {
    throw new Error('the Core must not scan a workspace when it was given facts only');
  },
};

const evaluateOnce = async (): Promise<string> => {
  const repoFacts = extractTypeScriptFacts({
    rootDir: FIXTURE,
    include: ['src'],
    now: () => new Date().toISOString(), // deliberately volatile: it must not leak into the verdict
  });
  const ctx = {
    kinds: ['architecture'],
    repoFacts,
    architecture: { symbolBoundaries: [BOUNDARY] },
  } as unknown as EvaluationContext;
  const result = await createArchitectureKindEvaluator(forbiddenDrift).evaluate(ctx, { satellitePath: '' });
  return JSON.stringify(result);
};

describe('GT-589 end-to-end: extract outside, evaluate inside', () => {
  it('answers the symbol-reachability question the import checks cannot pose', async () => {
    const result = JSON.parse(await evaluateOnce());
    const crossing = result.results.architecture.structuralFacts.boundaryCrossings[0];

    expect(crossing.ruleId).toBe('cli-must-not-reach-infrastructure');
    expect(crossing.symbolChain).toEqual([
      'src/cli/checkout-command.ts#runCheckout',
      'src/application/place-order.ts#placeOrder',
      'src/infrastructure/db-pool.ts#connectionPool',
    ]);
    // The proof that no pairwise import rule could have found this: there is no
    // cli → infrastructure import edge anywhere in the tree.
    expect(crossing.viaLegalImportsOnly).toBe(true);
    const imports: { from: string; to: string }[] = JSON.parse(
      JSON.stringify(
        extractTypeScriptFacts({ rootDir: FIXTURE, include: ['src'], now: () => 'x' }).imports,
      ),
    );
    expect(imports.some((i) => i.from.startsWith('src/cli/') && i.to.startsWith('src/infrastructure/'))).toBe(false);
  });

  it('also names the genuine runtime import cycle it found', async () => {
    const result = JSON.parse(await evaluateOnce());
    const cycles = result.results.architecture.structuralFacts.cycles;
    expect(cycles).toHaveLength(1);
    expect(cycles[0].chain).toEqual(['src/billing/invoice.ts', 'src/orders/order.ts', 'src/billing/invoice.ts']);
    expect(cycles[0].typeOnly).toBe(false);
  });

  it('produces BYTE-identical verdicts across two independent runs', async () => {
    const first = await evaluateOnce();
    const second = await evaluateOnce();
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });
});
