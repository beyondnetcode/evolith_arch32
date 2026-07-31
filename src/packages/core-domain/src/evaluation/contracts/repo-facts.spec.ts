/**
 * GT-589 — the queries over the structural fact base.
 *
 * These are the questions the flat `Violation[]` of the enforcer seam cannot pose,
 * exercised on hand-built facts so the answer is checkable by eye.
 */

import {
  REPO_FACTS_SCHEMA_VERSION,
  canonicalizeRepoFacts,
  findImportCycles,
  findSymbolBoundaryCrossings,
  matchesModulePattern,
  summarizeRepoFacts,
} from './repo-facts';
import type { RepoFacts, SymbolBoundaryRule } from './repo-facts';

const facts = (over: Partial<RepoFacts> = {}): RepoFacts => ({
  schemaVersion: REPO_FACTS_SCHEMA_VERSION,
  contentHash: 'sha256:test',
  provenance: {
    extractedBy: 'evolith-repo-facts',
    extractorVersion: '1.0.0',
    indexer: 'typescript-compiler-api',
    indexerVersion: '6.0.3',
    extractedAt: '2026-07-30T00:00:00.000Z',
  },
  modules: [],
  imports: [],
  symbols: [],
  references: [],
  ...over,
});

describe('matchesModulePattern', () => {
  it('keeps * inside one path segment and lets ** span segments', () => {
    expect(matchesModulePattern('src/cli/a.ts', 'src/cli/*.ts')).toBe(true);
    expect(matchesModulePattern('src/cli/deep/a.ts', 'src/cli/*.ts')).toBe(false);
    expect(matchesModulePattern('src/cli/deep/a.ts', 'src/cli/**')).toBe(true);
    expect(matchesModulePattern('src/app/a.ts', 'src/cli/**')).toBe(false);
  });
});

describe('canonicalizeRepoFacts', () => {
  it('is insensitive to collection order', () => {
    const a = facts({
      modules: [{ id: 'b.ts' }, { id: 'a.ts' }],
      imports: [{ from: 'b.ts', to: 'a.ts', typeOnly: false }],
    });
    const b = facts({
      modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
      imports: [{ from: 'b.ts', to: 'a.ts', typeOnly: false }],
    });
    expect(canonicalizeRepoFacts(a)).toBe(canonicalizeRepoFacts(b));
  });

  it('excludes the extraction timestamp and the hash itself', () => {
    const early = facts({ modules: [{ id: 'a.ts' }] });
    const late = facts({
      modules: [{ id: 'a.ts' }],
      contentHash: 'sha256:different',
      provenance: { ...early.provenance, extractedAt: '2027-01-01T00:00:00.000Z' },
    });
    expect(canonicalizeRepoFacts(early)).toBe(canonicalizeRepoFacts(late));
  });

  it('changes when the structure changes', () => {
    const before = facts({ modules: [{ id: 'a.ts' }] });
    const after = facts({ modules: [{ id: 'a.ts' }, { id: 'b.ts' }] });
    expect(canonicalizeRepoFacts(before)).not.toBe(canonicalizeRepoFacts(after));
  });
});

describe('findImportCycles', () => {
  it('names the concrete chain of a genuine cycle, not just its existence', () => {
    const cycles = findImportCycles(
      facts({
        modules: [{ id: 'a.ts' }, { id: 'b.ts' }, { id: 'c.ts' }, { id: 'z.ts' }],
        imports: [
          { from: 'a.ts', to: 'b.ts', typeOnly: false },
          { from: 'b.ts', to: 'c.ts', typeOnly: false },
          { from: 'c.ts', to: 'a.ts', typeOnly: false },
          { from: 'z.ts', to: 'a.ts', typeOnly: false },
        ],
      }),
    );
    expect(cycles).toHaveLength(1);
    expect(cycles[0].chain).toEqual(['a.ts', 'b.ts', 'c.ts', 'a.ts']);
    expect(cycles[0].component).toEqual(['a.ts', 'b.ts', 'c.ts']);
    expect(cycles[0].typeOnly).toBe(false);
  });

  it('reports a type-only cycle as type-only (erased at runtime)', () => {
    const cycles = findImportCycles(
      facts({
        modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
        imports: [
          { from: 'a.ts', to: 'b.ts', typeOnly: true },
          { from: 'b.ts', to: 'a.ts', typeOnly: true },
        ],
      }),
    );
    expect(cycles).toHaveLength(1);
    expect(cycles[0].typeOnly).toBe(true);
  });

  it('treats one runtime import on an edge as enough to make the cycle real', () => {
    const cycles = findImportCycles(
      facts({
        modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
        imports: [
          { from: 'a.ts', to: 'b.ts', typeOnly: true },
          { from: 'a.ts', to: 'b.ts', typeOnly: false },
          { from: 'b.ts', to: 'a.ts', typeOnly: true },
        ],
      }),
    );
    expect(cycles[0].typeOnly).toBe(false);
  });

  it('finds no cycle in an acyclic graph and ignores edges to unknown modules', () => {
    expect(
      findImportCycles(
        facts({
          modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
          imports: [
            { from: 'a.ts', to: 'b.ts', typeOnly: false },
            { from: 'b.ts', to: 'vendor.ts', typeOnly: false },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('is order-independent: shuffled input yields the identical answer', () => {
    const forward = facts({
      modules: [{ id: 'a.ts' }, { id: 'b.ts' }, { id: 'c.ts' }],
      imports: [
        { from: 'a.ts', to: 'b.ts', typeOnly: false },
        { from: 'b.ts', to: 'c.ts', typeOnly: false },
        { from: 'c.ts', to: 'a.ts', typeOnly: false },
      ],
    });
    const shuffled = facts({
      modules: [{ id: 'c.ts' }, { id: 'a.ts' }, { id: 'b.ts' }],
      imports: [
        { from: 'c.ts', to: 'a.ts', typeOnly: false },
        { from: 'a.ts', to: 'b.ts', typeOnly: false },
        { from: 'b.ts', to: 'c.ts', typeOnly: false },
      ],
    });
    expect(findImportCycles(shuffled)).toEqual(findImportCycles(forward));
  });
});

describe('findSymbolBoundaryCrossings', () => {
  // cli → application → infrastructure. Each import is legal in isolation; the
  // composition is not. This is the case no pairwise import rule can express.
  const layered = facts({
    modules: [
      { id: 'src/cli/checkout.ts', layer: 'cli' },
      { id: 'src/application/place-order.ts', layer: 'application' },
      { id: 'src/infrastructure/db-pool.ts', layer: 'infrastructure' },
    ],
    imports: [
      { from: 'src/cli/checkout.ts', to: 'src/application/place-order.ts', typeOnly: false },
      { from: 'src/application/place-order.ts', to: 'src/infrastructure/db-pool.ts', typeOnly: false },
    ],
    symbols: [
      { id: 'src/cli/checkout.ts#runCheckout', name: 'runCheckout', kind: 'function', moduleId: 'src/cli/checkout.ts', exported: true },
      { id: 'src/application/place-order.ts#placeOrder', name: 'placeOrder', kind: 'function', moduleId: 'src/application/place-order.ts', exported: true },
      { id: 'src/infrastructure/db-pool.ts#connectionPool', name: 'connectionPool', kind: 'variable', moduleId: 'src/infrastructure/db-pool.ts', exported: true },
    ],
    references: [
      { fromSymbol: 'src/cli/checkout.ts#runCheckout', toSymbol: 'src/application/place-order.ts#placeOrder' },
      { fromSymbol: 'src/application/place-order.ts#placeOrder', toSymbol: 'src/infrastructure/db-pool.ts#connectionPool' },
    ],
  });

  const rule: SymbolBoundaryRule = {
    id: 'cli-must-not-reach-infrastructure',
    fromModules: ['src/cli/**'],
    forbiddenSymbolModules: ['src/infrastructure/**'],
  };

  it('reports the full symbol chain and flags that every import on it is legal', () => {
    const crossings = findSymbolBoundaryCrossings(layered, [rule]);
    expect(crossings).toHaveLength(1);
    expect(crossings[0]).toMatchObject({
      ruleId: 'cli-must-not-reach-infrastructure',
      fromSymbol: 'src/cli/checkout.ts#runCheckout',
      toSymbol: 'src/infrastructure/db-pool.ts#connectionPool',
      viaLegalImportsOnly: true,
      severity: 'error',
    });
    expect(crossings[0].symbolChain).toEqual([
      'src/cli/checkout.ts#runCheckout',
      'src/application/place-order.ts#placeOrder',
      'src/infrastructure/db-pool.ts#connectionPool',
    ]);
    expect(crossings[0].moduleChain).toEqual([
      'src/cli/checkout.ts',
      'src/application/place-order.ts',
      'src/infrastructure/db-pool.ts',
    ]);
  });

  it('does NOT claim legality when the boundary imports the forbidden module directly', () => {
    const direct = facts({
      ...layered,
      imports: [
        ...layered.imports,
        { from: 'src/cli/checkout.ts', to: 'src/infrastructure/db-pool.ts', typeOnly: false },
      ],
    });
    expect(findSymbolBoundaryCrossings(direct, [rule])[0].viaLegalImportsOnly).toBe(false);
  });

  it('returns nothing when the boundary cannot reach the forbidden module at all', () => {
    const severed = facts({
      ...layered,
      references: [
        { fromSymbol: 'src/application/place-order.ts#placeOrder', toSymbol: 'src/infrastructure/db-pool.ts#connectionPool' },
      ],
    });
    expect(findSymbolBoundaryCrossings(severed, [rule])).toEqual([]);
  });

  it('honours the declared severity and skips rules with no matching modules', () => {
    expect(findSymbolBoundaryCrossings(layered, [{ ...rule, severity: 'warning' }])[0].severity).toBe('warning');
    expect(findSymbolBoundaryCrossings(layered, [{ ...rule, fromModules: ['src/nowhere/**'] }])).toEqual([]);
    expect(findSymbolBoundaryCrossings(layered, [])).toEqual([]);
  });
});

describe('summarizeRepoFacts', () => {
  it('echoes the extractor hash and counts, and runs every query', () => {
    const summary = summarizeRepoFacts(
      facts({
        modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
        imports: [
          { from: 'a.ts', to: 'b.ts', typeOnly: false },
          { from: 'b.ts', to: 'a.ts', typeOnly: false },
        ],
      }),
    );
    expect(summary).toMatchObject({
      contentHash: 'sha256:test',
      indexer: 'typescript-compiler-api',
      moduleCount: 2,
      importCount: 2,
      symbolCount: 0,
      referenceCount: 0,
    });
    expect(summary.cycles).toHaveLength(1);
    expect(summary.boundaryCrossings).toEqual([]);
  });
});
