import assert from 'node:assert/strict';
import test from 'node:test';
import {
  redactSecrets,
  parseDiffFiles,
  selectRelevantFiles,
  estimateTokens,
  budgetAndChunk,
  prepareReviewInput,
} from './review-input.mjs';

test('redactSecrets removes common credential patterns', () => {
  const googleKey = `AIza${'B'.repeat(35)}`; // AIza + 35 chars = valid length
  const sample = [
    'AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI1234567890bPxRfiCYEXAMPLEKEY"',
    'const token = "ghp_0123456789abcdef0123456789abcdef0123"',
    'Authorization: Bearer abcdef0123456789ABCDEF.token-value==',
    `google: ${googleKey}`,
  ].join('\n');
  const { text, redactions } = redactSecrets(sample);
  assert.ok(redactions >= 4, `expected >=4 redactions, got ${redactions}`);
  assert.ok(!text.includes('wJalrXUtnFEMI'), 'aws secret leaked');
  assert.ok(!text.includes('ghp_0123456789abcdef'), 'github token leaked');
  assert.ok(!text.includes(googleKey), 'google key leaked');
  assert.ok(text.includes('«REDACTED'), 'no redaction marker present');
});

test('redactSecrets handles PEM private keys', () => {
  const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...secret...\n-----END RSA PRIVATE KEY-----';
  const { text, redactions } = redactSecrets(pem);
  assert.equal(redactions, 1);
  assert.equal(text, '«REDACTED:private-key»');
});

test('redactSecrets is a no-op on clean text', () => {
  const { text, redactions } = redactSecrets('export function foo() { return 1; }');
  assert.equal(redactions, 0);
  assert.ok(text.includes('foo'));
});

const DIFF = [
  'diff --git a/src/app.ts b/src/app.ts',
  'index 111..222 100644',
  '--- a/src/app.ts',
  '+++ b/src/app.ts',
  '@@ -1 +1 @@',
  '+const x = 1;',
  'diff --git a/package-lock.json b/package-lock.json',
  '--- a/package-lock.json',
  '+++ b/package-lock.json',
  '+  "lockfileVersion": 3',
  'diff --git a/assets/logo.png b/assets/logo.png',
  'Binary files a/assets/logo.png and b/assets/logo.png differ',
  'diff --git a/rulesets/data/data-mesh.rego b/rulesets/data/data-mesh.rego',
  '--- a/rulesets/data/data-mesh.rego',
  '+++ b/rulesets/data/data-mesh.rego',
  '+package evolith.data_mesh',
].join('\n');

test('parseDiffFiles splits per-file sections', () => {
  const files = parseDiffFiles(DIFF);
  assert.deepEqual(
    files.map((f) => f.path),
    ['src/app.ts', 'package-lock.json', 'assets/logo.png', 'rulesets/data/data-mesh.rego'],
  );
});

test('selectRelevantFiles drops lockfiles, binaries; keeps source and rulesets', () => {
  const { included, excluded } = selectRelevantFiles(DIFF);
  assert.deepEqual(included.map((f) => f.path), ['src/app.ts', 'rulesets/data/data-mesh.rego']);
  assert.deepEqual(excluded, ['package-lock.json', 'assets/logo.png']);
});

test('estimateTokens is roughly 4 chars/token', () => {
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcdefgh'), 2);
});

test('budgetAndChunk truncates an oversize file and flags it', () => {
  const big = { path: 'big.ts', body: 'x'.repeat(5000) };
  const { chunks, truncated } = budgetAndChunk([big], { maxBytes: 1000, maxTokens: 1000 });
  assert.equal(truncated, true);
  assert.ok(chunks.join('').includes('«TRUNCATED big.ts»'));
  assert.ok(Buffer.byteLength(chunks[0]) <= 1100);
});

test('budgetAndChunk splits multiple files across chunks under budget', () => {
  const sections = [
    { path: 'a.ts', body: 'a'.repeat(600) },
    { path: 'b.ts', body: 'b'.repeat(600) },
    { path: 'c.ts', body: 'c'.repeat(600) },
  ];
  const { chunks } = budgetAndChunk(sections, { maxBytes: 1000, maxTokens: 1000 });
  assert.ok(chunks.length >= 2, `expected multiple chunks, got ${chunks.length}`);
});

test('prepareReviewInput redacts, selects and budgets end-to-end', () => {
  const diffWithSecret = `${DIFF}\n+const API_KEY = "ghp_0123456789abcdef0123456789abcdef0123"`;
  const out = prepareReviewInput(diffWithSecret, { maxBytes: 100000, maxTokens: 25000 });
  assert.deepEqual(out.filesIncluded, ['src/app.ts', 'rulesets/data/data-mesh.rego']);
  assert.ok(out.filesExcluded.includes('package-lock.json'));
  assert.ok(out.redactions >= 1, 'secret in changed source not redacted');
  assert.ok(!out.chunks.join('').includes('ghp_0123456789abcdef'), 'secret leaked into payload');
  assert.ok(out.estTokens > 0 && out.bytes > 0);
});
