/**
 * GT-589 — the extractor produces a real, deterministic fact base OUTSIDE the Core.
 *
 * The fixture is a five-module TypeScript tree with (a) a genuine runtime import
 * cycle and (b) a three-hop chain in which every import is legal in isolation.
 */

import * as path from 'path';
import { extractTypeScriptFacts } from './typescript-fact-extractor';
import { serializeRepoFacts } from './serialize';
import { computeRepoFactsHash } from './content-hash';

const FIXTURE = path.resolve(__dirname, '..', 'test', 'fixtures', 'layered-repo');

const extract = (now: string) =>
  extractTypeScriptFacts({ rootDir: FIXTURE, include: ['src'], now: () => now });

describe('extractTypeScriptFacts (GT-589)', () => {
  const facts = extract('2026-07-30T00:00:00.000Z');

  it('records every module of the tree, sorted', () => {
    expect(facts.modules.map((m) => m.id)).toEqual([
      'src/application/place-order.ts',
      'src/billing/invoice.ts',
      'src/cli/checkout-command.ts',
      'src/infrastructure/db-pool.ts',
      'src/orders/order.ts',
    ]);
  });

  it('resolves relative import specifiers into module-graph edges', () => {
    expect(facts.imports.map((i) => i.from + ' -> ' + i.to)).toEqual([
      'src/application/place-order.ts -> src/infrastructure/db-pool.ts',
      'src/billing/invoice.ts -> src/orders/order.ts',
      'src/cli/checkout-command.ts -> src/application/place-order.ts',
      'src/orders/order.ts -> src/billing/invoice.ts',
    ]);
  });

  it('emits SCIP-shaped symbol ids with kind and export visibility', () => {
    expect(facts.symbols).toContainEqual({
      id: 'src/infrastructure/db-pool.ts#connectionPool',
      name: 'connectionPool',
      kind: 'variable',
      moduleId: 'src/infrastructure/db-pool.ts',
      exported: true,
    });
    expect(facts.symbols.map((s) => s.id)).toContain('src/cli/checkout-command.ts#runCheckout');
  });

  it('resolves cross-module symbol REFERENCES through the type checker', () => {
    expect(facts.references).toContainEqual({
      fromSymbol: 'src/cli/checkout-command.ts#runCheckout',
      toSymbol: 'src/application/place-order.ts#placeOrder',
    });
    expect(facts.references).toContainEqual({
      fromSymbol: 'src/application/place-order.ts#placeOrder',
      toSymbol: 'src/infrastructure/db-pool.ts#connectionPool',
    });
  });

  it('records provenance naming the indexer that produced the facts', () => {
    expect(facts.provenance).toMatchObject({
      extractedBy: 'evolith-repo-facts',
      indexer: 'typescript-compiler-api',
    });
    expect(facts.provenance.indexerVersion).toMatch(/^\d+\./);
  });
});

describe('content-hash reproducibility (GT-589 AC-3)', () => {
  it('two extractions of the same tree agree on the contentHash', () => {
    expect(extract('2026-07-30T00:00:00.000Z').contentHash).toBe(
      extract('2027-01-01T12:34:56.000Z').contentHash,
    );
  });

  it('the hash is the digest of the canonical form, not of the file bytes', () => {
    const facts = extract('2026-07-30T00:00:00.000Z');
    expect(computeRepoFactsHash(facts)).toBe(facts.contentHash);
    expect(facts.contentHash.startsWith('sha256:')).toBe(true);
  });

  it('serializing without the timestamp is byte-identical across runs', () => {
    const a = serializeRepoFacts(extract('2026-07-30T00:00:00.000Z'), { omitTimestamp: true });
    const b = serializeRepoFacts(extract('2031-05-05T05:05:05.000Z'), { omitTimestamp: true });
    expect(Buffer.from(b).equals(Buffer.from(a))).toBe(true);
  });

  it('a structural change moves the hash', () => {
    const full = extract('2026-07-30T00:00:00.000Z');
    const partial = extractTypeScriptFacts({
      rootDir: FIXTURE,
      include: ['src/cli'],
      now: () => '2026-07-30T00:00:00.000Z',
    });
    expect(partial.contentHash).not.toBe(full.contentHash);
  });
});
