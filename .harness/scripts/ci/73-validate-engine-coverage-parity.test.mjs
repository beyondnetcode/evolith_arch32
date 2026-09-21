/**
 * GT-716 AC3 — unit tests for the ratchet itself. The live guard needs both engines
 * built and an `init`; the properties that decide whether an entry is NEW, STALE or
 * CHANGED are asserted here against hand-built outcomes and baselines.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveOutcomes } from './68-validate-engine-verdict-parity.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  COVERAGE_PAGES,
  FOLLOW_UP,
  classFromReport,
  coverageFragmentOf,
  coverageOf,
  coverageOnly,
  decisionIndex,
  nativeReason,
  opaReason,
  readDecisions,
  reconcileCoverage,
  reconcileCoverageTotals,
  reconcileDecisions,
  renderCoverageTable,
  rulesOf,
  toBaselineScenario,
  unknownDecisionRules,
  validateDecisions,
  withCoverageFragment,
} from './73-validate-engine-coverage-parity.mjs';
import { REPO_ROOT } from '../lib/paths.mjs';
import { readCorpusFacts } from '../lib/rule-facts.mjs';

const outcomes = (data) => deriveOutcomes(data);

test('a rule decided by one engine and skipped by the other is coverage-only, in the right direction', () => {
  const native = outcomes({ skippedRuleIds: ['A-01'], issues: [{ ruleId: 'B-01' }] }); // A skipped, B failed
  const opa = outcomes({ skippedRuleIds: ['B-01'], issues: [{ ruleId: 'A-01' }] }); // B skipped, A failed
  const { nativeOnly, opaOnly } = coverageOnly(native, opa, new Set(['A-01', 'B-01', 'C-01']));
  assert.deepEqual(nativeOnly, [{ ruleId: 'B-01', other: 'skipped' }]);
  assert.deepEqual(opaOnly, [{ ruleId: 'A-01', other: 'skipped' }]);
  // C-01 is mentioned by neither report: decided and clean on both sides — not coverage-only.
});

test('a rule neither engine decides is not coverage-only either — it is a gap, not a difference', () => {
  const native = outcomes({ skippedRuleIds: ['X-01'] });
  const opa = outcomes({ nonExecutableRuleIds: ['X-01'] });
  assert.deepEqual(coverageOnly(native, opa, new Set(['X-01'])), { nativeOnly: [], opaOnly: [] });
});

test('a skip that ALSO carries a "did not run" issue stays a skip — 68\'s precedence is reused, not re-implemented', () => {
  const native = outcomes({ skippedRuleIds: ['KI-R01'], issues: [{ ruleId: 'KI-R01', title: 'Blocking rule did not run' }] });
  const opa = outcomes({ issues: [{ ruleId: 'KI-R01', description: 'Knowledge candidate must declare a source' }] });
  assert.deepEqual(coverageOnly(native, opa, new Set(['KI-R01'])).opaOnly, [{ ruleId: 'KI-R01', other: 'skipped' }]);
});

test('the class a report states for a skip is read from its issue row', () => {
  const data = { issues: [{ ruleId: 'MTN-01', description: 'This rule is declared `blocking: true` and was NOT evaluated (needs-supplied-facts). Declared facts: …' }] };
  assert.equal(classFromReport(data, 'MTN-01'), 'needs-supplied-facts');
  assert.equal(classFromReport(data, 'OTHER-01'), null);
});

test('the OPA reason comes from the bundle manifest: undeclared id, or facets a bare run does not supply', () => {
  const manifest = {
    declared: new Set(['GIT-01', 'INH-06']),
    inputPaths: new Map([['GIT-01', ['input.satellite.git.branchNameInvalid']], ['INH-06', ['input.satellite.files']]]),
  };
  const vocabulary = new Map([['satellite.git', { provenance: 'external' }], ['satellite.files', { provenance: 'observed' }]]);
  const corpus = new Map([['INH-06', { facts: ['satellite.files'] }]]);
  assert.equal(opaReason('SEC-INJ-01', manifest, corpus, vocabulary).class, 'no-policy-in-bundle');
  const git = opaReason('GIT-01', manifest, corpus, vocabulary);
  assert.equal(git.class, 'supplied-facet-absent');
  assert.deepEqual(git.facets, ['satellite.git']);
  // declared, reads only observed facets, and still not decided: the guard says so rather than guessing
  assert.equal(opaReason('INH-06', manifest, corpus, vocabulary).class, 'undecided');
});

test('the OPA reason prefers what the report states, facets included; the builder\'s emitted set beats provenance as the fallback', () => {
  const manifest = { declared: new Set(['HXA-03', 'TAX-01']), inputPaths: new Map([['HXA-03', ['input.satellite.layers.core']], ['TAX-01', ['input.repository.files']]]) };
  const vocabulary = new Map([['satellite.layers', { provenance: 'observed' }], ['repository', { provenance: 'observed' }]]);
  const report = { issues: [{ ruleId: 'HXA-03', description: "Not evaluated: the policy deciding 'HXA-03' reads `input.satellite.layers`, and this run supplied no such fact." }] };
  const stated = opaReason('HXA-03', manifest, new Map(), vocabulary, report, new Set(['satellite.files']));
  assert.equal(stated.class, 'supplied-facet-absent');
  assert.deepEqual(stated.facets, ['satellite.layers']);
  // no row (a non-blocking skip): `repository` is observed in nature, but the builder never emits it
  const inferred = opaReason('TAX-01', manifest, new Map(), vocabulary, { issues: [] }, new Set(['satellite.files']));
  assert.equal(inferred.class, 'supplied-facet-absent');
  assert.deepEqual(inferred.facets, ['repository']);
});

test('the native reason prefers what the report states, then the declaration, and names a handler that declined', () => {
  const corpus = new Map([['ACL-02', { facts: ['adapter'] }], ['DEP-03', { facts: ['repository'] }]]);
  const snapshot = { 'ACL-02': 'needs-supplied-facts', 'DEP-03': 'native-handler' };
  const stated = { issues: [{ ruleId: 'ACL-02', description: 'NOT evaluated (needs-supplied-facts).' }] };
  assert.equal(nativeReason('ACL-02', stated, snapshot, corpus).class, 'needs-supplied-facts');
  assert.equal(nativeReason('ACL-02', { issues: [] }, snapshot, corpus).class, 'needs-supplied-facts');
  assert.equal(nativeReason('DEP-03', { issues: [] }, snapshot, corpus).class, 'handler-declined');
  assert.equal(nativeReason('NEW-01', { issues: [] }, snapshot, corpus).class, 'undecided');
});

test('the ratchet closes both ways, and a changed class is neither new nor stale but wrong', () => {
  const measured = {
    nativeOnly: [{ ruleId: 'A-01', reason: { class: 'no-policy-in-bundle', why: '' } }, { ruleId: 'N-01', reason: { class: 'no-policy-in-bundle', why: '' } }],
    opaOnly: [{ ruleId: 'B-01', reason: { class: 'needs-runtime', why: '' } }],
  };
  const baseline = {
    nativeOnly: { 'A-01': { class: 'no-policy-in-bundle' }, 'S-01': { class: 'no-policy-in-bundle' } },
    opaOnly: { 'B-01': { class: 'unimplemented-native' } },
  };
  const r = reconcileCoverage(measured, baseline);
  assert.deepEqual(r.unregistered.map((e) => e.ruleId), ['N-01']);
  assert.deepEqual(r.stale.map((e) => e.ruleId), ['S-01']);
  assert.deepEqual(r.changed.map((e) => `${e.ruleId}:${e.from}→${e.to}`), ['B-01:unimplemented-native→needs-runtime']);
});

test('an empty baseline is not an excuse — every coverage-only rule is unregistered', () => {
  const measured = { nativeOnly: [{ ruleId: 'A-01', reason: { class: 'no-policy-in-bundle', why: '' } }], opaOnly: [] };
  assert.equal(reconcileCoverage(measured, undefined).unregistered.length, 1);
});

test('the baseline shape carries class, why and a follow-up per entry', () => {
  const rendered = toBaselineScenario({
    nativeOnly: [{ ruleId: 'A-01', reason: { class: 'no-policy-in-bundle', why: 'w' } }],
    opaOnly: [{ ruleId: 'B-01', reason: { class: 'mystery', why: 'w' } }],
  });
  assert.equal(rendered.nativeOnly['A-01'].followUp, FOLLOW_UP['no-policy-in-bundle']);
  assert.equal(rendered.opaOnly['B-01'].followUp, FOLLOW_UP.undecided);
});

test('a native-side class stated on the OPA side is OPA giving no reason of its own — filed as such, not as handler debt', () => {
  const manifest = { declared: new Set(['HXA-01']), inputPaths: new Map([['HXA-01', ['input.satellite.layers']]]) };
  const report = { issues: [{ ruleId: 'HXA-01', description: "[MUST] This rule is declared `blocking: true` and was NOT evaluated (unimplemented-native). Enforcer 'dependency-cruiser' failed to run: not installed A blocking rule that skips is reported exactly like one that passed." }] };
  const r = opaReason('HXA-01', manifest, new Map(), new Map(), report, new Set());
  assert.equal(r.class, 'opa-gave-no-reason');
  assert.match(r.why, /dependency-cruiser/);
  assert.match(FOLLOW_UP['opa-gave-no-reason'], /state why it declined/);
});

// ---------------------------------------------------------------------------
// GT-716 AC4 — nothing is coverage-only by omission: the decisions register
// ---------------------------------------------------------------------------

const decision = (over) => ({ id: 'd', kind: 'native-only', rules: ['A-01'], why: 'twenty characters or more of reason', recordedOn: '2026-09-21', ...over });
const measuredWith = ({ nativeOnly = [], opaOnly = [], decided = {} }) => ({
  nativeOnly: nativeOnly.map(([ruleId, cls]) => ({ ruleId, reason: { class: cls, why: '' } })),
  opaOnly: opaOnly.map(([ruleId, cls]) => ({ ruleId, reason: { class: cls, why: '' } })),
  decided: new Map(Object.entries(decided).map(([id, engines]) => [id, new Set(engines)])),
});

test('the register refuses a decision without an id, a kind, a dated reason, or the rules it covers', () => {
  assert.doesNotThrow(() => validateDecisions([decision()]));
  assert.doesNotThrow(() => validateDecisions([decision({ rules: undefined, pattern: '^CORE-\\d{4}-\\d{2}$' })]));
  assert.throws(() => validateDecisions([decision({ id: '' })]), /`id` is required/);
  assert.throws(() => validateDecisions([decision(), decision()]), /duplicate id/);
  assert.throws(() => validateDecisions([decision({ kind: 'maybe' })]), /`kind` must be one of/);
  assert.throws(() => validateDecisions([decision({ why: 'short' })]), /`why` must say why/);
  assert.throws(() => validateDecisions([decision({ recordedOn: 'yesterday' })]), /`recordedOn` must be YYYY-MM-DD/);
  assert.throws(() => validateDecisions([decision({ rules: [] })]), /`rules` \(ids\) or `pattern`/);
  assert.throws(() => validateDecisions([decision({ rules: undefined, pattern: '(' })]), /Invalid regular expression/);
  assert.throws(() => validateDecisions({ not: 'an array' }), /must be an array/);
});

test('a decision covers its ids and whatever its pattern matches in the universe; two decisions on one id is a throw', () => {
  const universe = new Set(['CORE-0001-01', 'CORE-0002-01', 'MTN-01', 'A-01']);
  const byPattern = decision({ id: 'p', kind: 'neither', rules: undefined, pattern: '^CORE-\\d{4}-\\d{2}$' });
  assert.deepEqual([...rulesOf(byPattern, universe)].sort(), ['CORE-0001-01', 'CORE-0002-01']);
  const index = decisionIndex([decision(), byPattern], universe);
  assert.equal(index.get('A-01').id, 'd');
  assert.equal(index.get('CORE-0002-01').id, 'p');
  assert.equal(index.has('MTN-01'), false);
  assert.throws(() => decisionIndex([decision(), decision({ id: 'again' })], universe), /covered by two decisions: d and again/);
});

test('a debt entry with no decision is coverage-only by omission; a declaration of the rule itself needs none', () => {
  const measured = measuredWith({
    nativeOnly: [['A-01', 'no-policy-in-bundle'], ['F-01', 'supplied-facet-absent'], ['H-01', 'opa-gave-no-reason']],
    opaOnly: [['B-01', 'unimplemented-native'], ['R-01', 'needs-runtime']],
    decided: { 'A-01': ['native'], 'F-01': ['native'], 'H-01': ['native'], 'B-01': ['opa'], 'R-01': ['opa'] },
  });
  const r = reconcileDecisions(measured, [decision()]);
  assert.deepEqual(r.undecided.map((e) => `${e.direction} ${e.ruleId} ${e.class}`), ['nativeOnly H-01 opa-gave-no-reason', 'opaOnly B-01 unimplemented-native']);
  assert.deepEqual(r.mismatched, []);
  assert.deepEqual(r.stale, []);
  assert.deepEqual(r.contradicted, []);
});

test('a decision that accepts the other direction is mismatched, not satisfied', () => {
  const measured = measuredWith({ opaOnly: [['A-01', 'unimplemented-native']], decided: { 'A-01': ['opa'] } });
  const r = reconcileDecisions(measured, [decision()]); // native-only, but OPA alone decides it
  assert.deepEqual(r.undecided, []);
  assert.deepEqual(r.mismatched.map((e) => `${e.ruleId}:${e.kind}`), ['A-01:native-only']);
  // …and the same fact seen from the decision's side: its engine is not the one that decided.
  assert.deepEqual(r.contradicted.map((e) => `${e.ruleId}:${e.decidedBy.join('+')}`), ['A-01:opa']);
});

test('the register cannot outlive its difference: both engines deciding a decided rule is stale', () => {
  const measured = measuredWith({ decided: { 'A-01': ['native', 'opa'] } });
  const r = reconcileDecisions(measured, [decision()]);
  assert.deepEqual(r.stale.map((e) => e.ruleId), ['A-01']);
});

test('a `neither` decision is contradicted by any engine deciding one of its rules — pattern included — and silent otherwise', () => {
  const neither = decision({ id: 'docs', kind: 'neither', rules: undefined, pattern: '^CORE-\\d{4}-\\d{2}$' });
  const quiet = measuredWith({ decided: { 'CORE-0001-01': [], 'CORE-0002-01': [], 'MTN-01': ['native', 'opa'] } });
  assert.deepEqual(reconcileDecisions(quiet, [neither]), { undecided: [], mismatched: [], stale: [], contradicted: [] });
  const loud = measuredWith({ decided: { 'CORE-0001-01': ['native'], 'CORE-0002-01': [] } });
  assert.deepEqual(reconcileDecisions(loud, [neither]).contradicted.map((e) => `${e.ruleId}:${e.decidedBy.join('+')}`), ['CORE-0001-01:native']);
});

test('a decision naming a rule no scenario saw is a typo or a departed rule, and is reported once across scenarios', () => {
  const unknown = unknownDecisionRules([decision({ rules: ['A-01', 'GONE-99'] })], [new Set(['A-01']), new Set(['B-01'])]);
  assert.deepEqual(unknown, [{ decision: 'd', ruleId: 'GONE-99' }]);
});

test('the committed register is well-formed and every rule it names exists in the corpus', () => {
  const decisions = readDecisions();
  assert.ok(decisions.length >= 5, 'the register carries the AC4 decisions');
  const ids = new Set(readCorpusFacts(resolve(REPO_ROOT, 'src/rulesets'), REPO_ROOT).keys());
  const missing = decisions.flatMap((d) => (d.rules ?? []).filter((id) => !ids.has(id)));
  assert.deepEqual(missing, [], 'decision rule ids must be corpus rule ids');
  assert.ok(decisions.some((d) => d.kind === 'neither' && d.pattern), 'the ADR-conformance decision is a pattern over the generated id shape');
});

// ---------------------------------------------------------------------------
// GT-716 AC5 — the page says what the report says: the coverage block and its render
// ---------------------------------------------------------------------------

const report = (over) => ({ rulesTotal: 159, rulesChecked: 56, rulesSkipped: 103, rulesErrored: 0, rulesNotApplicable: 30, skippedByEvaluability: { 'needs-supplied-facts': 31, 'needs-external-system': 20, 'needs-runtime': 14, 'documentation-only': 30, 'unimplemented-native': 8 }, ...over });

test('coverage is read from the report and grouped the way the reporter groups it', () => {
  const c = coverageOf(report({}));
  assert.deepEqual([c.inScope, c.decided, c.skipped, c.notApplicable], [159, 56, 103, 30]);
  assert.deepEqual(c.grouped, { supplied: 31, adapter: 34, documentation: 30, debt: 8, other: 0 });
  const withOther = coverageOf(report({ skippedByEvaluability: { 'no-policy-in-bundle': 25, 'supplied-facet-absent': 34, mystery: 2 } }));
  assert.deepEqual(withOther.grouped, { supplied: 34, adapter: 0, documentation: 0, debt: 25, other: 2 });
  assert.deepEqual(coverageOf(undefined).grouped, { supplied: 0, adapter: 0, documentation: 0, debt: 0, other: 0 });
});

test('coverage that moved is named field by field, class by class — and an unregistered engine is a move too', () => {
  const measured = { native: coverageOf(report({})), opa: coverageOf(report({ rulesChecked: 7, rulesSkipped: 152, skippedByEvaluability: { 'supplied-facet-absent': 120 } })) };
  const same = reconcileCoverageTotals(measured, JSON.parse(JSON.stringify(measured)));
  assert.deepEqual(same, []);
  const registered = JSON.parse(JSON.stringify(measured));
  registered.native.decided = 55; registered.native.byClass['needs-runtime'] = 15; delete registered.opa;
  const moved = reconcileCoverageTotals(measured, registered);
  assert.deepEqual(moved.map((e) => `${e.engine}.${e.field}:${e.from}→${e.to}`), ['native.decided:55→56', 'native.byClass.needs-runtime:15→14', 'opa.(all):null→measured']);
});

test('the rendered table is deterministic, bilingual, and carries the measurement date and the four groups', () => {
  const coverage = { repository: { native: coverageOf(report({})), opa: coverageOf(report({ rulesChecked: 7, rulesSkipped: 152, skippedByEvaluability: { 'supplied-facet-absent': 120, 'no-policy-in-bundle': 25, mystery: 7 } })) }, 'init-satellite': {} };
  const en = renderCoverageTable(coverage, '2026-09-21', 'en');
  assert.match(en, /^_Measured 2026-09-21 by `73-validate-engine-coverage-parity\.mjs --write`/);
  assert.match(en, /\| this repository \| native \(default\) \| 159 \| 56 \| 103 \| 31 \| 34 \| 30 \| 8 \| 30 \|/);
  assert.match(en, /\| this repository \| `--engine opa` \| 159 \| 7 \| 152 \| 120 \| 0 \| 0 \| 25 \(\+7\) \| 30 \|/);
  assert.equal(en, renderCoverageTable(coverage, '2026-09-21', 'en'));
  const es = renderCoverageTable(coverage, '2026-09-21', 'es');
  assert.match(es, /^_Medido el 2026-09-21/);
  assert.match(es, /\| este repositorio \| nativo \(por defecto\) \| 159 \| 56 \| 103 \|/);
  assert.notEqual(en, es);
});

test('the fragment is replaced between its markers and read back verbatim; a page without markers is null, not silently skipped', () => {
  const page = '# Page\n\nintro\n\n<!-- engine-coverage:begin -->\nold table\n<!-- engine-coverage:end -->\n\noutro\n';
  const next = withCoverageFragment(page, 'NEW');
  assert.equal(next, '# Page\n\nintro\n\n<!-- engine-coverage:begin -->\nNEW\n<!-- engine-coverage:end -->\n\noutro\n');
  assert.equal(coverageFragmentOf(next), 'NEW');
  assert.equal(withCoverageFragment('no markers here', 'NEW'), null);
  assert.equal(coverageFragmentOf('no markers here'), null);
});

test('the committed pages carry the markers, in both languages', () => {
  for (const rel of Object.values(COVERAGE_PAGES)) {
    const text = readFileSync(resolve(REPO_ROOT, rel), 'utf8');
    assert.notEqual(coverageFragmentOf(text), null, `${rel} carries the engine-coverage markers`);
  }
});
