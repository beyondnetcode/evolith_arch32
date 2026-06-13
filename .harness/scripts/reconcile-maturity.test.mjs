import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard } from './reconcile-maturity.mjs';

test('parseBoard derives status totals and freshness from the canonical table', () => {
  const result = parseBoard(`**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P1 | M | \`DONE\` |
| [\`GT-42\`](./catalog.md#gt-42) | Contracts | Cross | P1 | M | \`PENDING\` |
`);
  assert.deepEqual(result, {
    lastUpdated: '2026-06-13',
    counts: { total: 2, done: 1, pending: 1, inProgress: 0, deferred: 0 },
  });
});

test('parseBoard rejects content without canonical evidence', () => {
  assert.throws(() => parseBoard('# Narrative only'), /Could not parse/);
});

