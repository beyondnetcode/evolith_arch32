/**
 * GT-595 — the measurement, recomputed on every run against the real corpus.
 *
 * GT-569 published an honest denominator ("269 of 380 skipped") and GT-595 asked
 * the next question: WHY. This suite answers it by loading every
 * `src/rulesets/**\/*.rules.json` in the repository, asking the real
 * {@link NativeEvaluator} handler set which rules it claims, and classifying the
 * rest through {@link classifyRule}. Nothing here is mocked: if the corpus grows
 * a rule the triage table has not seen, the coverage assertions move and this
 * suite says so.
 *
 * The two figures worth remembering:
 *  - the handler backlog is **48 rules**, not 240;
 *  - **129 rules are documentation** — 126 auto-generated ADR-conformance
 *    placeholders that say in their own text that no check was wired, plus 3
 *    board-judgement rules — and 91 of those are flagged `blocking: true`.
 *
 * Every assertion below fails against the pre-GT-595 code: `classifyRule`,
 * `summarizeEvaluability` and `AdrConformanceRuleHandler` did not exist, and all
 * 240 unhandled rules were one undifferentiated `skipped`.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ADR_CONFORMANCE_CATEGORY,
  RULE_TRIAGE,
  RuleEvaluability,
  isNonExecutable,
} from './rule-evaluability';
import { REPO_ROOT, RULESETS_ROOT, triageCorpus, renderSnapshot } from '../../../test/rule-corpus-triage';

// The corpus loader, the real handler set, the classification AND the snapshot
// renderer live in `test/rule-corpus-triage.ts`. They used to live HERE, which
// meant jest was the only thing that could run them — and that is why
// `native-evaluability-snapshot.json` was maintained by hand and drifted.
//
// GT-640 (registered as GT-633) RECONCILIATION: the renderer in particular had two implementations, one
// here and one in `capture-native-evaluability-snapshot.mjs`, written in parallel
// by sessions that could not see each other. Two generators for one artifact is
// the defect GT-640 exists to remove, one level up: whichever ran last would win
// and the other's `--check` would go red for no visible reason. There is now ONE
// renderer, and this suite is its PIN rather than a second copy of it.
const TRIAGE = triageCorpus();
const { corpus: CORPUS, classified: CLASSIFIED, summary: SUMMARY, claims } = TRIAGE;

/**
 * The class counts this repository is pinned to.
 *
 * Also the counts `native-evaluability-snapshot.json` must reproduce. READ OUT OF
 * THIS FILE by `src/rulesets/standards/iso-5055-mapping.test.mjs`, which runs in a
 * job with no node_modules and so cannot recompute them — keep it a plain literal,
 * and note that that guard THROWS if it cannot find this declaration rather than
 * passing. Restoring it is what a reconciliation that deleted it owes back.
 */
const PINNED_CLASS_COUNTS: Readonly<Record<RuleEvaluability, number>> = {
  // 154 -> 158 on 2026-07-31: GT-584 added PEA-01..04
  // (`src/rulesets/evidence/probabilistic-evidence-admissibility.rules.json`) and
  // `ProbabilisticEvidenceRuleHandler` claims all four, so the corpus grew by
  // exactly four rules that RUN. A rule added without its handler would have
  // landed in `unimplemented-native` instead, and that difference is the whole
  // point of pinning both numbers.
  //
  // 136 -> 137 on 2026-08-02: ADR-0125 (a single artifact registry, GT-650) was
  // written, and `generate-adr-rulesets.mjs` emits one conformance placeholder per
  // ADR. It lands in `documentation-only` because its `validationQuery` says no
  // check was ever wired — which is correct for a `Proposed` decision nobody has
  // implemented yet. Every other class is unchanged, and that is the assertion:
  // an ADR is prose until someone writes its handler, and pinning both numbers is
  // what stops a new decision looking like new enforcement.
  //
  // 158 -> 166 on 2026-08-08: GT-600 shipped the first international standard as
  // an evaluable ruleset — `src/rulesets/standards/ssdf-v1.1.rules.json`, eight
  // SSDF v1.1 practices — and `SsdfRuleHandler` claims all eight, so the corpus
  // grew by exactly eight rules that RUN. That equality is the assertion: a
  // standards pack shipped as JSON alone would have landed all eight in
  // `unimplemented-native` while reading, from outside, like standards coverage.
  // The practices whose evidence is a repository SETTING rather than a file are
  // deliberately NOT in the ruleset; they are named in its `notEvaluableHere`
  // block, so the corpus did not grow by rules nothing can decide.

  //
  // GT-662 (+4, 2026-08-09): the ISO/IEC 5055 pack, one rule per measure. They
  // land in `unimplemented-native` because no NATIVE handler decides them —
  // which is correct and is the whole design: they carry `enforce:` and are
  // decided by an adapter over a free analyser's SARIF. Counting them as
  // native-handler would claim a capability this Core does not have.
  //
  // 166 -> 170 on 2026-08-09 (GT-665): the SLSA v1 Build track pack, four rules,
  // and `SlsaRuleHandler` claims all four. They land in `native-handler` and NOT
  // in `unimplemented-native` — the opposite of the ISO/IEC 5055 rules directly
  // above — because the two standards are different SHAPES, and the classes are
  // where that difference has to be visible. ISO/IEC 5055 names 138 structural
  // CWEs that only a code parser decides, so it is an adapter. The SLSA Build
  // track asks what the PRODUCER declares — provenance generated on publish, the
  // publishing job able to mint the identity that signs it, the artifact built by
  // the run being attested, no route to the registry that bypasses CI — and a
  // workflow file plus a package manifest answer all four. The half a filesystem
  // cannot decide (Build L3's platform properties, the predicate type the
  // registry serves, whether a signature verifies) is NOT in the pack at all; it
  // is named in the ruleset's `notEvaluableHere` block, so the corpus did not
  // grow by four rules and six promises.
  //
  // GT-675 (+0, 2026-08-16): `no-policy-in-bundle` joined the vocabulary. It is
  // pinned at ZERO on purpose and must stay there — this triage classifies the
  // corpus against the NATIVE handler table, and that class is a statement the
  // compiled OPA bundle makes about itself at evaluation time. A non-zero here
  // would mean the native triage had started asserting something about a bundle
  // it never loaded.
  'native-handler': 171,
  // 137 -> 138 on 2026-08-16: ADR-0126's generated conformance ruleset. An accepted
  // ADR owes one, `generate-adr-rulesets.mjs` wrote it, and it lands here for the same
  // reason every generated ADR ruleset does — its validationQuery says nothing a native
  // handler can execute. A decision written down, not a check that stopped working.
  'documentation-only': 138,
  'unimplemented-native': 52,
  'needs-external-system': 20,
  'needs-runtime': 17,
  underspecified: 14,
  'no-policy-in-bundle': 0,
};

const SNAPSHOT_FILE = path.join(REPO_ROOT, 'src', 'rulesets', 'standards', 'native-evaluability-snapshot.json');

/**
 * `capturedOn` is carried forward from the committed document, exactly as the
 * capture script does, so the pin compares classification against classification
 * and never fails on a date.
 */
function committedCapturedOn(): string {
  return (JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')) as { capturedOn: string }).capturedOn;
}

describe('GT-595 · the capture consumed by src/rulesets/standards', () => {
  it('renders one class per rule, losing no id to a key collision', () => {
    // `classes` is keyed by rule id alone, so two rules sharing an id in
    // different files would silently collapse into one entry and understate
    // every count downstream of it.
    const rendered = JSON.parse(renderSnapshot(TRIAGE, { capturedOn: committedCapturedOn() })) as {
      counts: Record<string, number>;
      classes: Record<string, string>;
    };
    expect(Object.keys(rendered.classes)).toHaveLength(CORPUS.length);
    expect(Object.values(rendered.counts).reduce((a, b) => a + b, 0)).toBe(CORPUS.length);
  });

  it('keeps native-evaluability-snapshot.json byte-identical to a fresh capture', () => {
    // Deliberately does NOT write. There is one writer —
    // `node src/rulesets/standards/capture-native-evaluability-snapshot.mjs` —
    // and it is the one the GT-630 chain guard and `docs.yml` invoke. A second
    // writer is how this artifact ended up with two generators in the first place.
    const fresh = renderSnapshot(TRIAGE, { capturedOn: committedCapturedOn() });

    expect(fs.readFileSync(SNAPSHOT_FILE, 'utf8')).toBe(fresh);
  });
});

describe('GT-595 · the corpus is fully classified', () => {
  it('loads a corpus of the expected size (guards the measurement itself)', () => {
    // If this moves, every number below moved with it — re-triage before editing.
    expect(CORPUS.length).toBeGreaterThanOrEqual(370);
    // 400 -> 410 on 2026-08-08: the corpus is 402 after GT-600's eight SSDF
    // rules. The band is widened rather than pinned to the exact number, because
    // its job is to catch a corpus that COLLAPSED — the failure this whole file
    // exists to make impossible — not to be edited on every legitimate addition.
    //
    // 410 -> 420 on 2026-08-09: GT-665's four SLSA rules put the corpus at
    // exactly 410, i.e. on the ceiling. Widened rather than left there, because a
    // band whose upper bound equals the current value stops being a band: the
    // next legitimate pack fails an assertion that has nothing to say about it,
    // and an assertion that fails for the wrong reason gets raised reflexively
    // until it means nothing. The floor is the half that catches a collapse and
    // it is untouched.
    expect(CORPUS.length).toBeLessThanOrEqual(420);
  });

  it('assigns EVERY rule exactly one evaluability class', () => {
    const classes = new Set(CLASSIFIED.map(c => c.evaluability));
    for (const c of classes) {
      expect([
        'native-handler', 'unimplemented-native', 'needs-external-system',
        'needs-runtime', 'documentation-only', 'underspecified',
      ]).toContain(c);
    }
    const counted = Object.values(SUMMARY.byClass).reduce((a, b) => a + b, 0);
    expect(counted).toBe(CORPUS.length);
    expect(SUMMARY.total).toBe(CORPUS.length);
  });

  it('never leaves an unrecognised rule out of the denominator by accident', () => {
    // The default class for an unknown rule is `unimplemented-native`, which is
    // INSIDE the executable denominator. A rule can only leave it by an explicit
    // triage entry or by being a generator placeholder.
    const escaped = CLASSIFIED.filter(c => isNonExecutable(c.evaluability))
      .filter(c => !RULE_TRIAGE[c.ruleId] && !c.why.includes('generator placeholder'));
    expect(escaped).toEqual([]);
  });

  it('has a triage entry for every rule it claims to have triaged (no stale ids)', () => {
    const corpusIds = new Set(CORPUS.map(r => r.id));
    const stale = Object.keys(RULE_TRIAGE).filter(id => !corpusIds.has(id));
    expect(stale).toEqual([]);
  });
});

describe('GT-595 · the published breakdown, with its denominator', () => {
  it('reports the measured class counts', () => {
    // Measured 2026-07-28 against 379 rules in 167 ruleset files. Recomputed on
    // every run: these are the numbers that turn "240 handlers to write" into a
    // costed decision, so they are pinned rather than merely printed.
    //
    // 139 -> 151 on 2026-07-29, from TWO independent closures that landed
    // together and touch DISJOINT rule sets, so their effects add:
    //   +8  the config-shaped rules (GT-595) — ED-R04/R05/R06 and DAM-R05
    //       (topology flags, claimed by ID because their bare categories are
    //       shared across topologies) and MTN-05, GIT-08, SEC-RL-01, SEC-RL-02
    //       (config assertions in GovernanceRuleHandler);
    //   +4  the module-boundary rules (GT-632) — HXA-01/02/04/05 each authored a
    //       complete `from`/`to` module-graph clause that nothing read, because
    //       `enforce` was dropped at normalization. It is now carried, and
    //       `ModuleBoundaryRuleHandler` evaluates it.
    // `unimplemented-native` drops by the same twelve; nothing else moved.
    // Asserted against the SINGLE declaration above, not against a second inline
    // copy of the same six numbers. There used to be two — this constant, read by
    // the dependency-free guard in `src/rulesets/standards`, and a literal here —
    // which is GT-640's own defect in miniature: two copies of one fact, and
    // editing either leaves the other silently disagreeing.
    expect(SUMMARY.byClass).toEqual(PINNED_CLASS_COUNTS);
  });

  it('publishes the honest denominator: 151 rules nothing can ever run', () => {
    // 137 documentation-only + 14 underspecified.
    //
    // 150 -> 151 on 2026-08-02: the ADR-0125 conformance placeholder. See the
    // note on PINNED_CLASS_COUNTS — the +1 is a decision written down, not a
    // check that stopped working.
    //
    // 143 -> 150 on 2026-07-28, and the +7 is a finding rather than drift: the
    // committed generated corpus was SEVEN rulesets behind its own generator.
    // ADR-0118 and the six security standards ADR-0119..0124 (SSRF, input
    // validation, shell-execution safety, timing-safe comparison, credential
    // management) had no conformance ruleset at all, because nobody re-ran
    // `generate-adr-rulesets.mjs` after they were accepted. Regenerating for
    // GT-571 surfaced them, and this snapshot failing is what made it visible.
    //
    // 151 -> 152 on 2026-08-16: ADR-0126's generated conformance ruleset, the same +1
    // recorded against `documentation-only` above.
    expect(SUMMARY.nonExecutable).toBe(152);
    expect(SUMMARY.executableTotal).toBe(SUMMARY.total - 152);
    expect(SUMMARY.nonExecutableRuleIds).toHaveLength(152);
  });

  it('names the blocking rules that can never produce a verdict', () => {
    // Was 96 auto-generated ADR placeholders + 11 hand-authored rules with no
    // validationQuery at all (EC-SEC / SV-SEC x2 each, KI-R01..07). GT-595 AC2
    // made `blocking` + `skipped` fail the run, which turned the 96 placeholders
    // from a reported oddity into 96 run-failing issues — so
    // `generate-adr-rulesets.mjs` now emits them `blocking: false`, since their
    // own validationQuery says no check was ever wired. What is left is the 11
    // that a human declared blocking and never gave a check to; those are a
    // governance decision (author the check or drop the flag), not a generator
    // bug, so they stay visible and keep failing the run.
    expect(SUMMARY.blockingNonExecutable.length).toBe(11);
    expect(SUMMARY.blockingNonExecutable).not.toContain('CORE-0111-01');
    expect(SUMMARY.blockingNonExecutable).toContain('EC-SEC-01');
    expect(SUMMARY.blockingNonExecutable).toContain('KI-R01');
  });

  it('publishes a coverage ratio per ruleset (AC3)', () => {
    expect(SUMMARY.perRuleset.length).toBeGreaterThan(100);
    for (const r of SUMMARY.perRuleset) {
      expect(r.handled).toBeLessThanOrEqual(r.executable);
      expect(r.executable).toBeLessThanOrEqual(r.total);
      expect(r.total).toBeGreaterThan(0);
    }

    // A generated ADR ruleset: one rule, documentation-only ⇒ zero executable.
    const generated = SUMMARY.perRuleset.find(r => r.sourceFile.includes('adr-0111-quality-signal'));
    expect(generated).toMatchObject({ total: 1, executable: 0, handled: 0 });

    // A ruleset the engine really does evaluate keeps a non-zero ratio.
    const evidence = SUMMARY.perRuleset.find(r => r.sourceFile.endsWith('evidence/evidence-manifest.rules.json'));
    expect(evidence!.handled).toBeGreaterThan(0);
  });
});

describe('GT-595 · the handler slice that landed', () => {
  it('shrinks the unclaimed corpus from 240 rules to 102', () => {
    // 114 -> 102 on 2026-07-29: the eight config-shaped closures (GT-595) plus
    // the four module-boundary closures (GT-632). Disjoint sets, so -8 and -4.
    //
    // 102 -> 106 on 2026-08-09 (GT-662): the four ISO/IEC 5055 measure rules.
    // "Unclaimed" here means "no native handler", and they have none by design —
    // an adapter over a free analyser's SARIF decides them. The number going UP
    // for a capability that was ADDED is the honest reading, and pretending
    // otherwise would be the claim this file exists to prevent.
    const unclaimed = CORPUS.filter(r => !claims(r));
    expect(unclaimed).toHaveLength(106);

    // ...and every one of the 134 ADR-conformance rules is now claimed.
    // 126 -> 133 on 2026-07-28: the committed corpus was seven rulesets behind
    // its generator (ADR-0118 plus the six security standards 0119..0124), which
    // regenerating for GT-571 surfaced.
    // 133 -> 134 on 2026-08-02: ADR-0125 (GT-650). One ADR, one placeholder. The
    // `every(claims)` below is the assertion that matters — a new ADR must arrive
    // CLAIMED by the conformance handler, not land in the unclaimed pile.
    // 134 -> 135 on 2026-08-16: ADR-0126 (the bilingual mandate narrows to an entry
    // surface). Same shape as the ADR-0125 bump above — one accepted ADR, one generated
    // conformance placeholder, claimed by the conformance handler.
    const adrConformance = CORPUS.filter(r => r.category === 'adr-conformance');
    expect(adrConformance).toHaveLength(135);
    expect(adrConformance.every(claims)).toBe(true);
  });

  it('leaves 73 unclaimed blocking rules, down from 176', () => {
    // 176 -> 85 (GT-595 handler slice) -> 73, from two closures that landed
    // together over DISJOINT rule sets: -8 config-shaped (GT-595) and -4
    // module-boundary (GT-632). Every one of the twelve is `blocking: true`,
    // which is why the whole of each closure lands on this figure.
    const unclaimedBlocking = CORPUS.filter(r => !claims(r) && r.blocking);
    expect(unclaimedBlocking).toHaveLength(73);
  });

  it('claims each of the four module-boundary rules closed on 2026-07-29', () => {
    // GT-632. Named rather than counted, for the same reason as the eight
    // below: the count alone cannot tell a closure from a rule that left the
    // corpus. HXA-03 is the control — same ruleset, no `enforce` block, so it
    // must stay unclaimed.
    const byId = new Map(CORPUS.map(r => [r.id, r]));
    for (const id of ['HXA-01', 'HXA-02', 'HXA-04', 'HXA-05']) {
      expect(byId.get(id)).toBeDefined();
      expect(claims(byId.get(id)!)).toBe(true);
    }
    expect(claims(byId.get('HXA-03')!)).toBe(false);
  });

  it('claims each of the eight config-shaped rules closed on 2026-07-29', () => {
    // Named rather than merely counted: the count alone cannot tell a closure
    // from a rule that left the corpus.
    const byId = new Map(CORPUS.map(r => [r.id, r]));
    for (const id of ['ED-R04', 'ED-R05', 'ED-R06', 'DAM-R05', 'MTN-05', 'GIT-08', 'SEC-RL-01', 'SEC-RL-02']) {
      expect(byId.get(id)).toBeDefined();
      expect(claims(byId.get(id)!)).toBe(true);
    }

    // The non-blocking halves of the two SHARED topology categories stay
    // unclaimed on purpose: `retention` belongs to DAM-R05 *and* ED-R07,
    // `schema-evolution` to ED-R06 *and* DAM-R08, and each pair points at a
    // different config file. If a category-keyed dispatch ever replaces the
    // id-keyed one, these two get claimed and answered against the wrong file.
    expect(claims(byId.get('ED-R07')!)).toBe(false);
    expect(claims(byId.get('DAM-R08')!)).toBe(false);
  });

  it('does not pretend the ADR-conformance rules were EVALUATED', () => {
    // The handler claims them so they can be classified; it never returns
    // `passed`. Coverage is honest precisely because this is true.
    const adrIds = new Set(CORPUS.filter(r => r.category === 'adr-conformance').map(r => r.id));
    const classifiedAdr = CLASSIFIED.filter(c => adrIds.has(c.ruleId));
    expect(classifiedAdr.every(c => c.evaluability === 'documentation-only')).toBe(true);
  });
});

describe('GT-595 AC2 · the corpus rules that still declare `blocking` and cannot run', () => {
  // A rule declared `blocking: true` whose class is anything but `native-handler`
  // will come back `skipped`, and GT-595 AC2 makes that combination FAIL the run.
  // This is therefore the live defect list, measured rather than asserted.
  const offenders = CLASSIFIED.filter(c => c.blocking && c.evaluability !== 'native-handler');
  const countOf = (klass: RuleEvaluability) => offenders.filter(o => o.evaluability === klass).length;

  it('no longer includes the auto-generated ADR placeholders (fixed at the generator)', () => {
    // Was 96. Every one carried a validationQuery that ends "Concrete checks to
    // be wired into the harness" — the corpus claiming enforcement it never
    // wired. `generate-adr-rulesets.mjs` now emits `blocking: false` for them;
    // `severity: MUST` and `enforcement: executable` are kept, because those
    // describe the ADR and this stays real handler backlog.
    expect(countOf('documentation-only')).toBe(0);
    expect(offenders.map(o => o.ruleId)).not.toContain('CORE-0111-01');
  });

  it('enumerates the 73 that remain, by what each one would cost to close', () => {
    // NOT a tolerance and NOT a suppression list: every one of these fails a run
    // today. It is pinned so the number can only move deliberately, and so a new
    // rule cannot quietly join it.
    //  - unimplemented-native  : write the handler (decidable from the tree).
    //  - needs-external-system : write the adapter (VCS host, tracker, live DB, mesh).
    //  - needs-runtime         : write the adapter that observes a running system.
    //  - underspecified        : author the check, or drop the flag — a human
    //                            declared these blocking and gave them no
    //                            validationQuery at all, so unlike the generated
    //                            placeholders the fix is a governance decision.
    //
    // 85 -> 73 on 2026-07-29. All twelve came out of `unimplemented-native`
    // (48 -> 36), which is what that class was always supposed to mean: a
    // handler was all that was missing. Eight were config-shaped (GT-595) and
    // four were module-boundary clauses the corpus already carried and the
    // engine never read (GT-632). The other three classes are untouched — no
    // adapter was written and no rule was re-authored.
    expect(offenders).toHaveLength(73);
    expect(countOf('unimplemented-native')).toBe(36);
    expect(countOf('needs-external-system')).toBe(14);
    expect(countOf('needs-runtime')).toBe(12);
    expect(countOf('underspecified')).toBe(11);

    expect(offenders.filter(o => o.evaluability === 'underspecified').map(o => o.ruleId).sort()).toEqual([
      'EC-SEC-01', 'EC-SEC-02', 'KI-R01', 'KI-R02', 'KI-R03', 'KI-R04',
      'KI-R05', 'KI-R06', 'KI-R07', 'SV-SEC-01', 'SV-SEC-02',
    ]);
  });
});

describe('GT-595 · the remaining backlog is costed, not a lump', () => {
  const of = (klass: RuleEvaluability) => CLASSIFIED.filter(c => c.evaluability === klass).map(c => c.ruleId);

  it('separates handler work from adapter work from authoring work', () => {
    // Two rules left this list on 2026-07-29 and are asserted absent rather
    // than silently dropped:
    //  - MTN-05 (GT-595) — GovernanceRuleHandler now evaluates it;
    //  - HXA-01 (GT-632) — it is `native-handler` now. HXA-03, from the same
    //    ruleset, takes its place: genuine handler backlog, because
    //    "Infrastructure implements Core ports" is not a module-graph clause
    //    and the rule authors no `enforce` block.
    // OCB-02 stays, and deliberately: see the vacuity note below.
    expect(of('unimplemented-native')).toEqual(expect.arrayContaining(['SEC-INJ-01', 'HXA-03', 'OCB-02']));
    expect(of('unimplemented-native')).not.toContain('MTN-05');
    expect(of('unimplemented-native')).not.toContain('HXA-01');
    expect(of('needs-external-system')).toEqual(expect.arrayContaining(['GIT-02', 'MTN-02', 'OBS-EVD-03']));
    expect(of('needs-runtime')).toEqual(expect.arrayContaining(['OBS-EVD-01', 'TPY-05', 'ABAC-01']));
    expect(of('underspecified')).toEqual(expect.arrayContaining(['EC-SEC-01', 'KI-R01', 'INH-03']));
  });

  it('keeps runtime/external rules INSIDE the denominator — an adapter can close them', () => {
    expect(isNonExecutable('needs-external-system')).toBe(false);
    expect(isNonExecutable('needs-runtime')).toBe(false);
    expect(isNonExecutable('unimplemented-native')).toBe(false);
    expect(isNonExecutable('documentation-only')).toBe(true);
    expect(isNonExecutable('underspecified')).toBe(true);
  });
});

/**
 * OCB-02 — the ninth config-shaped rule, left OPEN on purpose.
 *
 * Its validationQuery reads: "Enterprise artifacts include metadata field
 * 'availability: enterprise'. Core artifacts either omit the field or set
 * 'availability: core'."
 *
 * The subject of that sentence is the empty set. NO artifact in this repository
 * carries an `availability` marker of either value — the measurement below is
 * the evidence, recomputed on every run rather than asserted once. So the rule
 * as written reduces to "for every enterprise artifact, ...", quantified over
 * nothing: a handler implementing it faithfully would return `passed` on every
 * repository that has ever existed and on every repository that ever could,
 * because the only way to produce a violation is to first add the very marker
 * whose absence is the actual problem.
 *
 * Wiring it would move OCB-02 out of the blocking-and-skipped list and into the
 * `native-handler` count — buying a number, not a check, and reproducing exactly
 * the false green GT-569 and GT-595 exist to remove. It therefore stays in the
 * backlog, flagged for RE-AUTHORING alongside OCB-05 (whose own check —
 * "Core rulesets contain no references to 'tracker', 'saas', 'dashboard'" — is
 * separately unsatisfiable against a corpus that names those concepts in prose).
 *
 * The honest closure for OCB-02 is a rule about the open-core MATRIX that the
 * ruleset already carries (`openCoreMatrix.core` / `.enterprise`), which is
 * populated and therefore decidable. That is authoring work, not handler work.
 */
describe('GT-595 · OCB-02 is vacuous as written — measured, not asserted', () => {
  const AVAILABILITY_MARKER = /(?:"availability"\s*:\s*"|^\s*availability\s*:\s*)(enterprise|core)\b/mi;

  /** Every artifact in the corpus — rulesets, schemas, rego, docs — not just *.rules.json. */
  function allArtifacts(dir: string, depth = 0): string[] {
    if (depth > 6) return [];
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) { out.push(...allArtifacts(full, depth + 1)); continue; }
      if (/\.(json|ya?ml|md|rego|csv)$/.test(entry)) out.push(full);
    }
    return out;
  }

  it('finds zero artifacts carrying `availability: enterprise` or `availability: core`', () => {
    const artifacts = allArtifacts(RULESETS_ROOT);
    expect(artifacts.length).toBeGreaterThan(150); // the scan really did run
    const marked = artifacts.filter(file => AVAILABILITY_MARKER.test(fs.readFileSync(file, 'utf8')));
    expect(marked).toEqual([]);
  });

  it('keeps OCB-02 in the backlog rather than closing it vacuously', () => {
    const ocb02 = CLASSIFIED.find(c => c.ruleId === 'OCB-02');
    expect(ocb02).toBeDefined();
    expect(ocb02!.evaluability).toBe('unimplemented-native');
    expect(ocb02!.blocking).toBe(true);
  });

  it('shows the open-core matrix IS populated — the re-authoring target', () => {
    // What OCB-02 should have been written against: a list with members.
    const file = path.join(RULESETS_ROOT, 'governance', 'open-core-boundary.rules.json');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { openCoreMatrix?: { core?: string[]; enterprise?: string[] } };
    expect(parsed.openCoreMatrix?.core?.length).toBeGreaterThan(0);
    expect(parsed.openCoreMatrix?.enterprise?.length).toBeGreaterThan(0);
  });
});
