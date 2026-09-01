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
  assert.deepEqual([...fieldNamesIn(corpus).keys()].sort(), ['identifier', 'metadata', 'status']);
});

test('it does not ask for words nobody will read', () => {
  const names = fieldNamesIn(corpus);
  // A list has no criterion operator that can judge it and is never published as a field; `$schema`
  // is JSON Schema plumbing. Demanding Spanish for either is demanding dead words.
  assert.equal(names.has('risks'), false);
  assert.equal(names.has('$schema'), false);
});

test('a section is asked for as well as the fields inside it', () => {
  // An object is not a field, but it IS the heading its leaves print under. A Spanish form under
  // an English section heading is the same half-translation, one line higher up.
  assert.equal(fieldNamesIn(corpus).has('metadata'), true);
  assert.equal(fieldNamesIn(corpus).has('identifier'), true);
});

test('a field with no entry is reported', () => {
  const { untranslated } = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    metadata: 'Metadatos',
  });
  assert.deepEqual(untranslated, ['identifier']);
});

test('AN ENTRY LEFT BEHIND BY A RENAME IS REPORTED', () => {
  // The direction a naive guard misses. It looks like coverage and translates nothing.
  const { orphans } = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    identifier: 'Identificador',
    metadata: 'Metadatos',
    oldNameNobodyPublishes: 'Fantasma',
  });
  assert.deepEqual(orphans, ['oldNameNobodyPublishes']);
});

test('an empty translation is a missing label, not a word', () => {
  const { blank } = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    metadata: 'Metadatos',
    identifier: '   ',
  });
  assert.deepEqual(blank, ['identifier']);
});

test('a full glossary reports nothing', () => {
  const problems = coverageProblems(fieldNamesIn(corpus), {
    status: 'Estado',
    metadata: 'Metadatos',
    identifier: 'Identificador',
  });
  assert.deepEqual(problems, { untranslated: [], orphans: [], blank: [] });
});
