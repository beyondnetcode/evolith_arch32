/**
 * GT-595 — the ADR-conformance handler, and the line it refuses to cross.
 *
 * Every assertion here fails against the pre-GT-595 code: the handler did not
 * exist, its 126 rules fell through to `{ result: 'skipped', message: 'Requires
 * external system or runtime verification' }` — a claim that happened to be
 * false for all of them — and nothing distinguished a stale ruleset citing a
 * deleted ADR from a rule that simply has no check.
 */

import { AdrConformanceRuleHandler } from './adr-conformance-rule.handler';
import { NativeEvaluator } from '../native-evaluator';
import { IFileSystem, ILogger } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../evaluator.interface';

const CTX: WorkspaceEvaluationContext = { satellitePath: '/sat', corePath: '/core' };

const PLACEHOLDER =
  'Verify codebase/CI compliance with ADR-0111 via static analysis, lint rules, or pipeline gates ' +
  'covering: layer, lint, enforce. Concrete checks to be wired into the harness.';

const rule = (over: Partial<NormalizedRule> = {}): NormalizedRule => ({
  id: 'CORE-0111-01',
  severity: 'MUST',
  category: 'adr-conformance',
  title: 'Conform to ADR-0111',
  description: 'Implementations MUST conform to the decision recorded in ADR-0111.',
  blocking: true,
  validationQuery: PLACEHOLDER,
  sourceFile: 'src/rulesets/adr/generated/adr-0111.rules.json',
  ...over,
});

function fsWith(opts: { ruleset?: unknown; existing?: (p: string) => boolean }): IFileSystem {
  return {
    readFile: jest.fn(async () => JSON.stringify(opts.ruleset ?? { references: [] })),
    exists: jest.fn(async (p: string) => (opts.existing ? opts.existing(p) : true)),
  } as unknown as IFileSystem;
}

const logger = (): ILogger =>
  ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() }) as never;

describe('GT-595 · AdrConformanceRuleHandler claims the generated corpus', () => {
  it('claims every rule stamped with the generator category, and nothing else', () => {
    const handler = new AdrConformanceRuleHandler(fsWith({}));
    expect(handler.canHandle(rule())).toBe(true);
    expect(handler.canHandle(rule({ category: 'security' }))).toBe(false);
    expect(handler.canHandle(rule({ category: 'governance' }))).toBe(false);
  });

  it('is reachable through the real NativeEvaluator wiring', async () => {
    const evaluator = new NativeEvaluator(
      fsWith({ ruleset: { references: ['reference/adr/0111.md'] } }),
      logger(),
      { parse: jest.fn() } as never,
    );

    const [result] = await evaluator.evaluateAll([rule()], CTX);

    // Pre-GT-595 this was the generic no-handler skip with no evaluability.
    expect(result.evaluability).toBe('documentation-only');
    expect(result.message).toContain('generator placeholder');
  });
});

describe('GT-595 · it classifies instead of pretending to evaluate', () => {
  it('reports a generator-placeholder rule as documentation-only, NEVER as passed', async () => {
    const handler = new AdrConformanceRuleHandler(
      fsWith({ ruleset: { references: ['reference/adr/0111.md'] } }),
    );

    const result = await handler.evaluate(rule(), CTX);

    expect(result.result).toBe('skipped');
    expect(result.result).not.toBe('passed');
    expect(result.evaluability).toBe('documentation-only');
    expect(result.message).toContain('cannot block');
  });

  it('keeps an ADR rule with a REAL validationQuery inside the coverage denominator', async () => {
    const handler = new AdrConformanceRuleHandler(
      fsWith({ ruleset: { references: ['reference/adr/0111.md'] } }),
    );

    const result = await handler.evaluate(
      rule({ validationQuery: 'No file under src/domain imports @nestjs/*.' }),
      CTX,
    );

    expect(result.result).toBe('skipped');
    expect(result.evaluability).toBe('unimplemented-native');
    expect(result.message).toContain('real coverage debt');
  });
});

describe('GT-595 · a ruleset citing a decision record that does not exist FAILS', () => {
  it('fails when the cited ADR is missing', async () => {
    const handler = new AdrConformanceRuleHandler(
      fsWith({
        ruleset: { references: ['reference/adr/0111.md', 'reference/adr/gone.md'] },
        existing: p => !p.includes('gone.md'),
      }),
    );

    const result = await handler.evaluate(rule(), CTX);

    expect(result.result).toBe('failed');
    expect(result.message).toContain('reference/adr/gone.md');
    expect(result.message).toContain('governs nothing');
  });

  it('does not fail — or throw — when the ruleset file cannot be read', async () => {
    const fs = {
      readFile: jest.fn(async () => { throw new Error('ENOENT'); }),
      exists: jest.fn(async () => true),
    } as unknown as IFileSystem;

    // A satellite evaluating a corpus it did not load from `corePath` must not
    // turn 126 rules into 126 `errored` results.
    const result = await new AdrConformanceRuleHandler(fs).evaluate(rule(), CTX);

    expect(result.result).toBe('skipped');
    expect(result.evaluability).toBe('documentation-only');
  });

  it('tolerates a ruleset with no references block', async () => {
    const handler = new AdrConformanceRuleHandler(fsWith({ ruleset: { title: 'no refs' } }));
    const result = await handler.evaluate(rule(), CTX);
    expect(result.result).toBe('skipped');
  });
});
