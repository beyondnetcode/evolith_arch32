import assert from 'node:assert/strict';
import test from 'node:test';
import { auditSource, auditSources, auditTopology, summarize, AUDIT_SCHEMA_VERSION } from './drift-audit.mjs';

// Fixture: the historical RAG false-upsert pattern (GT-145 before the fix).
const FALSE_UPSERT = `
if (RAG_SYNC_ENABLED) {
  // TODO: Replace with actual vector store client call
  console.log("→ Upserted into vector store");
}
`;

// Fixture: the historical unbounded agentic diff submission (GT-146 before the fix).
const UNBOUNDED_DIFF = `
const result = await invokeGemini(apiKey, fullDiff, tools);
function invokeGemini(key, diff) {
  const options = { hostname: "generativelanguage.googleapis.com", path: "/v1beta/models/gemini:generateContent?key=" + key };
  return https.request(options, (res) => {});
}
`;

// Fixture: compliant capability (bounded + truthful) — must NOT be flagged.
const COMPLIANT = `
const prepared = prepareReviewInput(diff, { maxTokens: 25000 });
const result = await provider.review(prompt);
await adapter.upsert(records);
console.log("✅ Review passed");
`;

test('flags the RAG false-upsert pattern', () => {
  const findings = auditSource(FALSE_UPSERT, 'fake-rag.mjs');
  assert.ok(findings.some((f) => f.ruleId === 'DRIFT-FALSE-SUCCESS'), 'false-upsert not detected');
  assert.equal(findings[0].severity, 'error');
  assert.ok(findings[0].line > 0);
});

test('flags an unbounded external call', () => {
  const findings = auditSource(UNBOUNDED_DIFF, 'fake-review.mjs');
  assert.ok(findings.some((f) => f.ruleId === 'DRIFT-UNBOUNDED-CALL'), 'unbounded call not detected');
});

test('does not flag a compliant, bounded, truthful capability', () => {
  const findings = auditSource(COMPLIANT, 'good.mjs');
  assert.deepEqual(findings, [], `unexpected findings: ${JSON.stringify(findings)}`);
});

test('does not flag a pure module with no external calls', () => {
  assert.deepEqual(auditSource('export const add = (a, b) => a + b;\n', 'm.mjs'), []);
});

test('auditSources produces a versioned report with counts', () => {
  const report = auditSources([
    { file: 'fake-rag.mjs', source: FALSE_UPSERT },
    { file: 'fake-review.mjs', source: UNBOUNDED_DIFF },
    { file: 'good.mjs', source: COMPLIANT },
  ]);
  assert.equal(report.schemaVersion, AUDIT_SCHEMA_VERSION);
  assert.equal(report.scanned, 3);
  assert.equal(report.counts.error, 2);
  assert.ok(report.findings.length === 2);
});

const ACCEPTED = {
  metadata: { id: 'event-driven', status: 'accepted' },
  spec: { artifacts: { adrs: ['reference/core/architecture/adrs/core/0031-x.md'] } },
};
// GT-329: event-driven moved to canonical rulesets/topologies/
const dir = 'src/rulesets/topologies/event-driven';
const fullSet = new Set([
  `${dir}/event-driven.rules.json`,
  `${dir}/event-driven.rego`,
  `${dir}/README.md`,
  `${dir}/README.es.md`,
  'reference/core/architecture/adrs/core/0031-x.md',
]);

test('accepted topology with full parity and resolving refs passes', () => {
  const findings = auditTopology(ACCEPTED, (p) => fullSet.has(p), dir);
  assert.deepEqual(findings, []);
});

test('accepted topology missing the OPA policy is flagged', () => {
  const without = new Set(fullSet);
  without.delete(`${dir}/event-driven.rego`);
  const findings = auditTopology(ACCEPTED, (p) => without.has(p), dir);
  assert.ok(findings.some((f) => f.ruleId === 'TOPO-MISSING-ARTIFACT' && /OPA policy/.test(f.title)));
});

test('accepted topology with an orphaned reference warns', () => {
  const noRef = new Set(fullSet);
  noRef.delete('reference/core/architecture/adrs/core/0031-x.md');
  const findings = auditTopology(ACCEPTED, (p) => noRef.has(p), dir);
  assert.ok(findings.some((f) => f.ruleId === 'TOPO-ORPHAN-REF' && f.severity === 'warning'));
});

test('draft topologies are skipped', () => {
  const draft = { metadata: { id: 'x', status: 'draft' } };
  assert.deepEqual(auditTopology(draft, () => false, 'd'), []);
});

test('summarize renders clean and dirty reports', () => {
  assert.match(summarize({ scanned: 1, findings: [] }), /clean/);
  const dirty = auditSources([{ file: 'fake-rag.mjs', source: FALSE_UPSERT }]);
  assert.match(summarize(dirty), /DRIFT-FALSE-SUCCESS/);
});
