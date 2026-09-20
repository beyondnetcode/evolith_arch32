import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ruleInputPathsFromAst, inputPathOfRef, ruleIdOf } from './rego-rule-inputs.mjs';

// The extractor is meaningful only against what `opa parse` actually emits, so these
// tests parse real Rego with the pinned binary rather than a hand-written AST that
// could drift from the compiler. The binary is what `npm run build:policy` installs;
// its absence is a FAILURE here, not a skip — a walker tested against nothing has not
// been tested.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OPA = join(ROOT, '.harness', 'bin', process.platform === 'win32' ? 'opa.exe' : 'opa');

function parse(source) {
  assert.ok(existsSync(OPA), `${OPA} is missing — run \`npm run build:policy\` once to install the pinned OPA binary`);
  const file = join(mkdtempSync(join(tmpdir(), 'rego-inputs-')), 'policy.rego');
  writeFileSync(file, source);
  return JSON.parse(execFileSync(OPA, ['parse', '--format', 'json', file], { maxBuffer: 64 * 1024 * 1024 }).toString());
}

const POLICY = `package evolith.probe

import rego.v1

# Direct reads, negated and plain, in body and head.
violations contains {"id": "P-01", "message": sprintf("adapter %v", [input.adapter.name])} if {
	not input.adapter.schemaValidated
	input.satellite.git.branchNameInvalid
}

# A helper, followed transitively — the rule body itself names no input.
violations contains {"id": "P-02", "message": "m"} if {
	not has_tracing
}

has_tracing if {
	some pkg in all_deps
	startswith(pkg, "@opentelemetry/")
}

all_deps contains pkg if {
	input.satellite.packageJson.dependencies[pkg]
}

# some/in, a comprehension, a function call and an every — every shape a policy uses.
violations contains {"id": "P-03", "message": "m"} if {
	some d in input.satellite.multiTenancy.tenants
	count([f | f := input.satellite.files[_]; endswith(f, ".md")]) > 0
	documented(input.core.adrs)
	every w in input.waiver { w.status == "active" }
}

documented(adrs) if {
	count(adrs) > count(input.evidence)
}

# Two bodies for ONE id: the union of what both read.
violations contains {"id": "P-04", "message": "a"} if {
	input.satellite.testing.unitTestPercentage < 65
}

violations contains {"id": "P-04", "message": "b"} if {
	input.satellite.testing.e2eTestPercentage > 15
	not input.satellite.scorecards.declared
}

# No literal id (a projection), and a rule that reads nothing at all.
violations contains v if {
	v := input.satellite.workflows[_]
}

# The id assigned in the body — the phase-gate style — is the same declaration.
violations contains v if {
	some required in input.gate.mandatoryEvidence
	not presented[required.artifact]
	v := {"id": "P-06", "message": sprintf("missing %v", [required.artifact])}
}

presented contains a if {
	a := input.evidence[_].artifact
}

violations contains {"id": "P-05", "message": "constant"} if {
	true
}
`;

test('reads direct input paths from body AND head, negated or not', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  assert.deepEqual(inputs.get('P-01'), [
    'input.adapter.name',
    'input.adapter.schemaValidated',
    'input.satellite.git.branchNameInvalid',
  ]);
});

test('follows helper rules transitively, and stops a path at the first dynamic segment', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  // P-02's own body reads nothing; `has_tracing` → `all_deps` → the dependencies object.
  assert.deepEqual(inputs.get('P-02'), ['input.satellite.packageJson.dependencies']);
});

test('sees through some/in, comprehensions, function calls and every', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  assert.deepEqual(inputs.get('P-03'), [
    'input.core.adrs',
    'input.evidence', // read inside the `documented` function
    'input.satellite.files',
    'input.satellite.multiTenancy.tenants',
    'input.waiver',
  ]);
});

test('an id emitted by several bodies gets the UNION of their reads', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  assert.deepEqual(inputs.get('P-04'), [
    'input.satellite.scorecards.declared',
    'input.satellite.testing.e2ePercentage'.replace('e2ePercentage', 'e2eTestPercentage'),
    'input.satellite.testing.unitTestPercentage',
  ]);
});

test('a head without a literal id is not a rule; a rule reading nothing is an empty list', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  assert.deepEqual([...inputs.keys()].sort(), ['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06']);
  assert.deepEqual(inputs.get('P-05'), []);
});

test('the aggregate name itself is never followed as a helper — otherwise every rule would read everything', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  // P-05 shares the `violations` head with P-01…P-04 and must not inherit their reads.
  assert.deepEqual(inputs.get('P-05'), []);
});

test('term helpers: a ref rooted elsewhere is not an input path, a non-violations head has no id', () => {
  assert.equal(inputPathOfRef({ type: 'ref', value: [{ type: 'var', value: 'data' }, { type: 'string', value: 'x' }] }), null);
  assert.equal(inputPathOfRef({ type: 'ref', value: [{ type: 'var', value: 'input' }] }), 'input');
  assert.equal(ruleIdOf({ head: { name: 'has_tracing' } }), null);
});

test('a shipped policy: OBS-EVD-01 reads the dependencies through its helper chain', () => {
  const ast = JSON.parse(
    execFileSync(OPA, ['parse', '--format', 'json', join(ROOT, 'src/rulesets/opa/telemetry-evidence.rego')], { maxBuffer: 64 * 1024 * 1024 }).toString(),
  );
  const inputs = ruleInputPathsFromAst(ast);
  assert.ok(inputs.get('OBS-EVD-01')?.some((p) => p.startsWith('input.satellite.packageJson')), `OBS-EVD-01 reads ${JSON.stringify(inputs.get('OBS-EVD-01'))}`);
  // OBS-EVD-03 reads the SAME dependencies through `has_health_metrics` — observed, not supplied
  // (the row that registered GT-716 had it under `scorecards`; the AST says otherwise, and wins).
  assert.deepEqual(inputs.get('OBS-EVD-03'), ['input.satellite.packageJson.dependencies', 'input.satellite.packageJson.devDependencies']);
  // OBS-EVD-04 is the one that reads the supplied scorecards facet.
  assert.deepEqual(inputs.get('OBS-EVD-04'), ['input.satellite.scorecards.observabilityOperational']);
});

test('an id assigned in the body (the phase-gate style) is attributed, with the reads of its body and helpers', () => {
  const inputs = ruleInputPathsFromAst(parse(POLICY));
  assert.deepEqual(inputs.get('P-06'), ['input.evidence', 'input.gate.mandatoryEvidence']);
});

test('a shipped policy in that style: phase-gates.rego attributes its PG-* ids', () => {
  const ast = JSON.parse(
    execFileSync(OPA, ['parse', '--format', 'json', join(ROOT, 'src/rulesets/opa/phase-gates.rego')], { maxBuffer: 64 * 1024 * 1024 }).toString(),
  );
  const inputs = ruleInputPathsFromAst(ast);
  assert.ok([...inputs.keys()].some((id) => id.startsWith('PG-')), `ids: ${[...inputs.keys()].join(' ')}`);
  assert.ok([...inputs.values()].flat().some((p) => p.startsWith('input.gate')), 'the gate facet is read');
});
