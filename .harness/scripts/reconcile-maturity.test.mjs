import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoard, validateRuntimeEvidence } from './ci/09-reconcile-maturity.mjs';

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

test('runtime evidence accepts fresh PASS and gap-backed BLOCKED checks', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const base = {
    observedAt: '2026-06-13',
    commit: 'ae21c92',
    source: 'https://github.com/beyondnetcode/evolith_arch32/actions/runs/1',
    summary: 'Evidence',
  };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      { ...base, id: 'cli-baseline', status: 'PASS' },
      { ...base, id: 'coverage', status: 'BLOCKED', gap: 'GT-41' },
      { ...base, id: 'documentation', status: 'PASS' },
      { ...base, id: 'release', status: 'BLOCKED', gap: 'GT-41' },
    ],
  };
  assert.deepEqual(
    validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z')),
    [],
  );
});

test('runtime evidence accepts RESOLVED checks mapped to a closed gap without a run URL', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`DONE\` |
| [\`GT-42\`](./catalog.md#gt-42) | Pending | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const base = {
    observedAt: '2026-06-13',
    commit: 'ae21c92',
    source: 'https://github.com/beyondnetcode/evolith_arch32/actions/runs/1',
    summary: 'Evidence',
  };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      { ...base, id: 'cli-baseline', status: 'PASS' },
      { ...base, id: 'coverage', status: 'BLOCKED', gap: 'GT-42' },
      { ...base, id: 'documentation', status: 'PASS' },
      { id: 'release', status: 'RESOLVED', gap: 'GT-41', observedAt: '2026-06-13', commit: 'ae21c92', summary: 'Resolved in code' },
    ],
  };
  assert.deepEqual(
    validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z')),
    [],
  );
});

test('runtime evidence rejects RESOLVED checks mapped to an open gap', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      { id: 'release', status: 'RESOLVED', gap: 'GT-41', observedAt: '2026-06-13', commit: 'ae21c92', summary: 'Resolved in code' },
    ],
  };
  const errors = validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z'));
  assert.ok(errors.some((error) => error.includes('must map RESOLVED evidence to a closed gap')));
});

test('runtime evidence rejects stale and unowned blockers', () => {
  const content = `**Last Updated:** 2026-06-13
| [\`GT-41\`](./catalog.md#gt-41) | Reconcile | Cross | P0 | M | \`PENDING\` |
`;
  const board = { ...parseBoard(content), content };
  const evidence = {
    schemaVersion: '1.0.0',
    asOf: '2026-06-13',
    checks: [
      {
        id: 'cli-baseline',
        status: 'BLOCKED',
        gap: 'GT-99',
        observedAt: '2026-01-01',
        commit: 'missing00',
        source: 'invalid',
        summary: '',
      },
    ],
  };
  const errors = validateRuntimeEvidence(evidence, board, process.cwd(), new Date('2026-06-13T12:00:00Z'));
  assert.ok(errors.some((error) => error.includes('stale')));
  assert.ok(errors.some((error) => error.includes('active gap')));
  assert.ok(errors.some((error) => error.includes('Missing required maturity check')));
});
