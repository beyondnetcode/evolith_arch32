// GT-347: CI gate for the core governance OPA suite.
// Runs `opa test rulesets/opa/` (schemas excluded — they are input JSON Schemas,
// not data) and fails on any load error or failing test. Complements
// 28-test-topology-opa.mjs which only covers per-topology policies.
import { execFileSync } from 'node:child_process';
import { ensureOpa } from '../opa-runtime.mjs';

const root = process.cwd();
const opa = await ensureOpa(root);

let stdout;
try {
  stdout = execFileSync(
    opa.binary,
    ['test', 'rulesets/opa/', '--ignore=schemas', '--format=json'],
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

const failed = cases.filter((c) => c.fail === true || c.error);
if (failed.length > 0) {
  console.error(`Core OPA governance suite: ${failed.length}/${cases.length} failing:`);
  for (const f of failed) console.error(` - ${f.package}.${f.name}`);
  process.exit(1);
}

console.log(`Core OPA governance suite: ${cases.length}/${cases.length} passing (opa-${opa.version}).`);
