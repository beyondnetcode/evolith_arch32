import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { facetOfInputPath, readCorpusFacts, rulesOf, staleVocabulary, undeclaredReads } from './rule-facts.mjs';

const vocab = new Map(Object.entries({
  'satellite.multiTenancy': { provenance: 'supplied' },
  'satellite.files': { provenance: 'observed' },
  satellitePath: { provenance: 'observed' },
}));

function corpusWith(rules) {
  const root = mkdtempSync(join(tmpdir(), 'rule-facts-'));
  mkdirSync(join(root, 'pack'));
  writeFileSync(join(root, 'pack', 'a.rules.json'), JSON.stringify({ rules }));
  // a Spanish twin must not be read — it would double every id
  writeFileSync(join(root, 'pack', 'a.rules.es.json'), JSON.stringify({ rules }));
  return readCorpusFacts(root, root);
}

test('the facet of a path: first segment, or the second under satellite/core', () => {
  assert.equal(facetOfInputPath('input.satellite.multiTenancy.applicationFiltering'), 'satellite.multiTenancy');
  assert.equal(facetOfInputPath('input.core.adrs'), 'core.adrs');
  assert.equal(facetOfInputPath('input.adapter.schemaValidated'), 'adapter');
  assert.equal(facetOfInputPath('input.satellite'), null);
  assert.equal(facetOfInputPath('input'), null);
});

test('reads `rules` and `principles`, one entry per id, and tells "no facts key" from "facts: []"', () => {
  const corpus = corpusWith([{ id: 'A-1', facts: [] }, { id: 'A-2' }, { id: 'A-3', facts: ['satellite.files'] }]);
  assert.deepEqual(corpus.get('A-1').facts, []);
  assert.equal(corpus.get('A-2').facts, null);
  assert.deepEqual(corpus.get('A-3').facts, ['satellite.files']);
  assert.deepEqual(rulesOf({ principles: [{ id: 'P-1' }, { noId: true }] }).map((r) => r.id), ['P-1']);
  assert.deepEqual(rulesOf({ rules: [{ rules: [] }] }), []);
});

test('a policy reading a facet its rule does not declare is a finding; a declared read is not', () => {
  const corpus = corpusWith([
    { id: 'MTN-01', facts: ['satellite.multiTenancy'] },
    { id: 'INH-06', facts: ['satellite.files'] },
    { id: 'KI-R01', facts: [] },
  ]);
  const reads = new Map([
    ['MTN-01', ['input.satellite.multiTenancy.applicationFiltering']],
    ['INH-06', ['input.satellite.files', 'input.satellitePath']], // satellitePath undeclared
    ['KI-R01', ['input.knowledge_id']], // declared none, reads a facet the vocabulary lacks
    ['opa-multi-tenancy', ['input.satellite.multiTenancy']], // not a corpus rule: ignored
  ]);
  const findings = undeclaredReads(reads, corpus, vocab);
  assert.equal(findings.filter((f) => f.startsWith('MTN-01')).length, 0);
  assert.match(findings.find((f) => f.startsWith('INH-06')), /reads satellitePath which its `facts` \(satellite\.files\) do not declare/);
  assert.match(findings.find((f) => f.startsWith('KI-R01 (')), /reads knowledge_id which its `facts` \(none\) do not declare/);
  assert.match(findings.find((f) => f.includes('does not know')), /KI-R01 reads `knowledge_id`/);
  assert.equal(findings.some((f) => f.startsWith('opa-multi-tenancy')), false);
});

test('a rule with no `facts` key at all is a finding of its own — silence is not a declaration', () => {
  const corpus = corpusWith([{ id: 'X-1' }]);
  const [finding] = undeclaredReads(new Map([['X-1', ['input.satellite.files']]]), corpus, vocab);
  assert.match(finding, /declares no `facts` at all, and its policy reads satellite\.files/);
});

test('a vocabulary facet no rule declares and no policy reads is stale; one either side uses is not', () => {
  const corpus = corpusWith([{ id: 'A-1', facts: ['satellite.files'] }]);
  const reads = new Map([['PG-1', ['input.satellitePath']]]);
  assert.deepEqual(staleVocabulary(vocab, corpus, reads), ['satellite.multiTenancy']);
});
