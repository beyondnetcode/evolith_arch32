import { NormalizedRule } from '@beyondnet/evolith-core-domain/domain/models/normalized-rule';
import { IRulesetRepository } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';
import { CachingRulesetRepository } from './caching-ruleset.repository';

function rule(id: string): NormalizedRule {
  return {
    id,
    severity: 'MUST',
    category: 'governance',
    title: id,
    description: '',
    blocking: true,
    sourceFile: `${id}.rules.json`,
  } as NormalizedRule;
}

/** Counts loads and lets a test hold one open, so single-flight is observable. */
function makeInner(): IRulesetRepository & {
  calls: string[];
  release: () => void;
  fail: (err: Error) => void;
  succeed: () => void;
} {
  let pending: { resolve: (r: NormalizedRule[]) => void; reject: (e: Error) => void } | null =
    null;
  let mode: 'immediate' | 'deferred' = 'immediate';
  let nextError: Error | null = null;
  const calls: string[] = [];

  return {
    calls,
    async loadAllRulesets(corePath: string) {
      calls.push(corePath);
      if (nextError) {
        const err = nextError;
        throw err;
      }
      if (mode === 'immediate') return [rule('GOV-1'), rule('GOV-2')];
      return new Promise<NormalizedRule[]>((resolve, reject) => {
        pending = { resolve, reject };
      });
    },
    release() {
      mode = 'deferred';
    },
    fail(err: Error) {
      nextError = err;
    },
    succeed() {
      nextError = null;
      pending?.resolve([rule('GOV-1'), rule('GOV-2')]);
    },
  };
}

describe('CachingRulesetRepository (GT-646)', () => {
  // The defect this exists for: core-api re-read and re-validated the whole
  // corpus on every POST /api/v1/evaluate, blocking the event loop each time.
  it('reads the corpus once and serves every later load from memory', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    await repo.loadAllRulesets('/core');
    await repo.loadAllRulesets('/core');
    await repo.loadAllRulesets('/core');

    expect(inner.calls).toEqual(['/core']);
  });

  it('returns the same rules every time', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    const first = await repo.loadAllRulesets('/core');
    const second = await repo.loadAllRulesets('/core');

    expect(second).toEqual(first);
    expect(second.map((r) => r.id)).toEqual(['GOV-1', 'GOV-2']);
  });

  it('caches per corePath — one deployment may be asked about more than one Core', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    await repo.loadAllRulesets('/core-a');
    await repo.loadAllRulesets('/core-b');
    await repo.loadAllRulesets('/core-a');

    expect(inner.calls).toEqual(['/core-a', '/core-b']);
    expect(repo.cachedCorePaths().sort()).toEqual(['/core-a', '/core-b']);
  });

  // Without single-flight the cache would only move the stampede from steady
  // state to burst time: N concurrent cold requests, N concurrent disk walks.
  it('collapses concurrent cold loads into a single disk read', async () => {
    const inner = makeInner();
    inner.release(); // loads now hang until succeed()
    const repo = new CachingRulesetRepository(inner);

    const all = Promise.all([
      repo.loadAllRulesets('/core'),
      repo.loadAllRulesets('/core'),
      repo.loadAllRulesets('/core'),
    ]);
    inner.succeed();
    const results = await all;

    expect(inner.calls).toEqual(['/core']);
    expect(results.every((r) => r.length === 2)).toBe(true);
  });

  // A caller that sorts or splices what it is handed must not reorder the
  // corpus for every request that follows.
  it('hands each caller its own array', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    const first = await repo.loadAllRulesets('/core');
    first.length = 0;
    const second = await repo.loadAllRulesets('/core');

    expect(second).toHaveLength(2);
  });

  // GT-474 keeps its meaning: an unresolvable corpus still throws per request.
  // What must NOT happen is the process latching into permanent failure.
  it('never caches a failure — a repaired corpus loads on the next attempt', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);
    inner.fail(new Error('corpus unreadable'));

    await expect(repo.loadAllRulesets('/core')).rejects.toThrow('corpus unreadable');
    await expect(repo.loadAllRulesets('/core')).rejects.toThrow('corpus unreadable');
    expect(inner.calls).toHaveLength(2);
    expect(repo.cachedCorePaths()).toEqual([]);

    inner.succeed();
    await expect(repo.loadAllRulesets('/core')).resolves.toHaveLength(2);
  });

  it('re-reads disk after explicit invalidation', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    await repo.loadAllRulesets('/core');
    repo.invalidate('/core');
    await repo.loadAllRulesets('/core');

    expect(inner.calls).toEqual(['/core', '/core']);
  });

  it('invalidate() with no argument drops every corpus', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    await repo.loadAllRulesets('/core-a');
    await repo.loadAllRulesets('/core-b');
    repo.invalidate();

    expect(repo.cachedCorePaths()).toEqual([]);
  });

  // The boot hook's contract: preload leaves the cache warm, so the FIRST
  // request is already served from memory rather than paying the load.
  it('preload warms the cache and reports the rule count', async () => {
    const inner = makeInner();
    const repo = new CachingRulesetRepository(inner);

    await expect(repo.preload('/core')).resolves.toBe(2);
    await repo.loadAllRulesets('/core');

    expect(inner.calls).toEqual(['/core']);
  });
});
