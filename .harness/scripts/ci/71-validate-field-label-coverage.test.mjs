/**
 * The guard's two directions, asserted against hand-built corpora.
 *
 * Each was written against a deliberately wrong version first: a coverage check that only ever
 * looks for missing entries passes forever once the glossary is full, and never notices the
 * entries left behind by a rename — which look exactly like coverage and translate nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coverageProblems, fieldNamesIn } from './71-validate-field-label-coverage.mjs';

const corpus = {
  'prd.json': {
    properties: {
      status: { type: 'string' },
      metadata: { type: 'object', properties: { identifier: { type: 'string' } } },
      risks: { type: 'array' },
      $schema: { type: 'string' },
    },
  },
};

test('it asks for a name for every field that is published', () => {
  assert.deepEqual([...fieldNamesIn(corpus).keys()].sort(), ['identifier', 'status']);
});

test('it does not ask for words nobody will read', () => {
  const names = fieldNamesIn(corpus);
  // A list has no criterion operator that can judge it and is never published as a field; `$schema`
  // is JSON Schema plumbing. Demanding Spanish for either is demanding dead words.
  assert.equal(names.has('risks'), false);
  assert.equal(names.has('$schema'), false);
});

test('a nested field is asked for by its own name, not its parent', () => {
  assert.equal(fieldNamesIn(corpus).has('metadata'), false);
  assert.equal(fieldNamesIn(corpus).has('identifier'), true);
});

test('a field with no entry is reported', () => {
  const { untranslated } = coverageProblems(fieldNamesIn(corpus), { status: 'Estado' });
  assert.deepEqual(untranslated, ['identifier']);
});

test('AN ENTRY LEFT BEHIND BY A RENAME IS REPORTED', () => {
  // The direction a naive guard misses. It looks like coverage and translates nothing.
  const { orphans } = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    identifier: 'Identificador',
    oldNameNobodyPublishes: 'Fantasma',
  });
  assert.deepEqual(orphans, ['oldNameNobodyPublishes']);
});

test('an empty translation is a missing label, not a word', () => {
  const { blank } = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    identifier: '   ',
  });
  assert.deepEqual(blank, ['identifier']);
});

test('a full glossary reports nothing', () => {
  const problems = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    identifier: 'Identificador',
  });
  assert.deepEqual(problems, { untranslated: [], orphans: [], blank: [] });
});
