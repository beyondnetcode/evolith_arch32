// GT-347: CI gate for the core governance OPA suite.
// Runs `opa test rulesets/opa/` (schemas excluded — they are input JSON Schemas,
// not data) and fails on any load error or failing test. Complements
// 28-test-topology-opa.mjs which only covers per-topology policies.
import { execFileSync } from 'node:child_process';
import { ensureOpa } from '../opa-runtime.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const root = process.cwd();
const opa = await ensureOpa(root);

let stdout;
try {
  stdout = execFileSync(
    opa.binary,
    ['test', 'src/rulesets/opa/', '--ignore=schemas', '--format=json'],
    { cwd: root, encoding: 'utf8' },
  );
} catch (err) {
  // Non-zero exit: failing tests still emit JSON on stdout; a load/parse error does not.
  stdout = err.stdout || '';
  if (!stdout.trim()) {
    console.error('Core OPA governance suite failed to load:');
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}

let cases;
try {
  cases = JSON.parse(stdout);
} catch {
  console.error('Core OPA governance suite produced no parseable results (load error):');
  console.error(stdout);
  process.exit(1);
}

// GT-578: `opa test` over a directory with no *_test.rego exits 0 and emits
// `[]`. `failed` is then empty and the script prints "0/0 passing" — a green
// line for a suite that never ran. This is the same class the src/ move
// created: the directory argument is a path literal, and `src/rulesets/opa/`
// silently becoming wrong would look identical.
assertScanned(cases.length, {
  what: 'OPA test cases in the core governance suite',
  where: 'src/rulesets/opa/ (via `opa test --ignore=schemas`)',
});

const failed = cases.filter((c) => c.fail === true || c.error);
if (failed.length > 0) {
  console.error(`Core OPA governance suite: ${failed.length}/${cases.length} failing:`);
  for (const f of failed) console.error(` - ${f.package}.${f.name}`);
  process.exit(1);
}

console.log(`Core OPA governance suite: ${cases.length}/${cases.length} passing (opa-${opa.version}).`);
