import assert from 'node:assert/strict';
import test from 'node:test';
import { isSourcePath, sourceStaged } from './knowledge-okf-precommit-guard.mjs';

test('isSourcePath detecta corpus autoral e índice, no el lockfile ni el bundle', () => {
  assert.equal(isSourcePath('reference/knowledge/canonical/product.yaml'), true);
  assert.equal(isSourcePath('reference/knowledge/canonical/glossary/knowledge.md'), true);
  assert.equal(isSourcePath('reference/knowledge/knowledge.index.yaml'), true);
  // El lockfile del estándar (.json) NO dispara verify de proyección.
  assert.equal(isSourcePath('reference/knowledge/canonical/okf-spec.lock.json'), false);
  // El bundle publicado no es "fuente".
  assert.equal(isSourcePath('reference/knowledge/okf/product.md'), false);
  assert.equal(isSourcePath('.harness/scripts/knowledge-okf-project.mjs'), false);
});

test('sourceStaged filtra solo los cambios del corpus', () => {
  const staged = [
    'reference/knowledge/canonical/packs/knowledge-and-corpus.pack.yaml',
    'reference/knowledge/okf/packs/knowledge-and-corpus.md',
    'reference/knowledge/canonical/okf-spec.lock.json',
    'README.md',
  ];
  assert.deepEqual(sourceStaged(staged), [
    'reference/knowledge/canonical/packs/knowledge-and-corpus.pack.yaml',
  ]);
});

test('sin cambios de corpus no hay que verificar', () => {
  assert.deepEqual(sourceStaged(['README.md', 'src/index.ts', 'reference/knowledge/okf/log.md']), []);
});
