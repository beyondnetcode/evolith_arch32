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
 * The computation itself lives in `test/rule-corpus-triage.ts` so the snapshot
 * consumed by `src/rulesets/standards` can be CAPTURED from it rather than
 * hand-maintained. This suite is its pin; the last describe block below is the
 * other half — it fails when the committed snapshot stops agreeing with what a
 * fresh triage computes.
 *
 * The two figures worth remembering:
 *  - the handler backlog is **60 rules**, not 240;
 *  - **136 rules are documentation** — auto-generated ADR-conformance
 *    placeholders that say in their own text that no check was wired, plus 3
 *    board-judgement rules — and 96 of those are flagged `blocking: true`.
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
import { REPO_ROOT, triageCorpus } from '../../../test/rule-corpus-triage';

const { corpus: CORPUS, classified: CLASSIFIED, summary: SUMMARY, claims } = triageCorpus();

/**
 * The class counts this repository is pinned to.
 *
 * These are the numbers `native-evaluability-snapshot.json` must reproduce, and
 * the ones its capture script writes. Recomputed on every run: they are what
 * turns "240 handlers to write" into a costed decision, so they are pinned
 * rather than merely printed. Measured 2026-07-28 against 386 rules.
 */
const PINNED_CLASS_COUNTS: Readonly<Record<RuleEvaluability, number>> = {
  'native-handler': 139,
  'documentation-only': 136,
  'unimplemented-native': 60,
  'needs-external-system': 20,
  'needs-runtime': 17,
  underspecified: 14,
};

describe('GT-595 · the corpus is fully classified', () => {
  it('loads a corpus of the expected size (guards the measurement itself)', () => {
    // If this moves, every number below moved with it — re-triage before editing.
    expect(CORPUS.length).toBeGreaterThanOrEqual(370);
    expect(CORPUS.length).toBeLessThanOrEqual(400);
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
    expect(SUMMARY.byClass).toEqual(PINNED_CLASS_COUNTS);
  });

  it('publishes the honest denominator: 150 rules nothing can ever run', () => {
    // 136 documentation-only + 14 underspecified.
    //
    // 143 -> 150 on 2026-07-28, and the +7 is a finding rather than drift: the
    // committed generated corpus was SEVEN rulesets behind its own generator.
    // ADR-0118 and the six security standards ADR-0119..0124 (SSRF, input
    // validation, shell-execution safety, timing-safe comparison, credential
    // management) had no conformance ruleset at all, because nobody re-ran
    // `generate-adr-rulesets.mjs` after they were accepted. Regenerating for
    // GT-571 surfaced them, and this snapshot failing is what made it visible.
    expect(SUMMARY.nonExecutable).toBe(150);
    expect(SUMMARY.executableTotal).toBe(SUMMARY.total - 150);
    expect(SUMMARY.nonExecutableRuleIds).toHaveLength(150);
  });

  it('names the blocking rules that can never produce a verdict', () => {
    // 96 auto-generated ADR placeholders + 11 blocking rules with no authored
    // check (EC-SEC / SV-SEC x2 each, KI-R01..07). This is the number the
    // product ships as "enforced" and does not enforce. 91 -> 96 with the seven
    // ADR rulesets that were missing from the committed corpus.
    expect(SUMMARY.blockingNonExecutable.length).toBe(96 + 11);
    expect(SUMMARY.blockingNonExecutable).toContain('CORE-0111-01');
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
  it('shrinks the unclaimed corpus from 240 rules to 114', () => {
    const unclaimed = CORPUS.filter(r => !claims(r));
    expect(unclaimed).toHaveLength(114);

    // ...and every one of the 133 ADR-conformance rules is now claimed.
    // 126 -> 133 on 2026-07-28: the committed corpus was seven rulesets behind
    // its generator (ADR-0118 plus the six security standards 0119..0124), which
    // regenerating for GT-571 surfaced.
    const adrConformance = CORPUS.filter(r => r.category === ADR_CONFORMANCE_CATEGORY);
    expect(adrConformance).toHaveLength(133);
    expect(adrConformance.every(claims)).toBe(true);
  });

  it('leaves 85 unclaimed blocking rules, down from 176', () => {
    const unclaimedBlocking = CORPUS.filter(r => !claims(r) && r.blocking);
    expect(unclaimedBlocking).toHaveLength(85);
  });

  it('does not pretend the ADR-conformance rules were EVALUATED', () => {
    // The handler claims them so they can be classified; it never returns
    // `passed`. Coverage is honest precisely because this is true.
    const adrIds = new Set(CORPUS.filter(r => r.category === ADR_CONFORMANCE_CATEGORY).map(r => r.id));
    const classifiedAdr = CLASSIFIED.filter(c => adrIds.has(c.ruleId));
    expect(classifiedAdr.every(c => c.evaluability === 'documentation-only')).toBe(true);
  });
});

describe('GT-595 · the remaining backlog is costed, not a lump', () => {
  const of = (klass: RuleEvaluability) => CLASSIFIED.filter(c => c.evaluability === klass).map(c => c.ruleId);

  it('separates handler work from adapter work from authoring work', () => {
    expect(of('unimplemented-native')).toEqual(expect.arrayContaining(['SEC-INJ-01', 'HXA-01', 'MTN-05', 'OCB-02']));
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
 * GT-598 — the snapshot `src/rulesets/standards` consumes must be a CAPTURE.
 *
 * `native-evaluability-snapshot.json` is read by `build-iso-5055-mapping.mjs`,
 * which stamps `nativeEvaluability` onto every row of the ISO/IEC 5055 mapping.
 * A stale snapshot therefore does not stay contained: it launders a wrong
 * classification into a larger derived artifact and misstates the handler
 * backlog. Its own guard (`iso-5055-mapping.test.mjs`) cannot catch that on its
 * own — it runs in a job with no node_modules and so cannot compute the truth.
 *
 * This is where the truth exists, so this is where the comparison belongs. If it
 * fails, run:
 *   node src/rulesets/standards/capture-native-evaluability-snapshot.mjs
 *   node src/rulesets/standards/build-iso-5055-mapping.mjs
 */
describe('GT-598 · the captured snapshot still matches a fresh triage', () => {
  const SNAPSHOT_PATH = path.join(REPO_ROOT, 'src/rulesets/standards/native-evaluability-snapshot.json');
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) as {
    counts: Record<string, number>;
    classes: Record<string, RuleEvaluability>;
  };

  it('agrees on the class counts', () => {
    expect(snapshot.counts).toEqual(PINNED_CLASS_COUNTS);
  });

  it('agrees on the class of every rule, id by id', () => {
    // Duplicate ids across rulesets collapse to one entry, so compare against
    // the same collapse rather than against the raw corpus length.
    const fresh: Record<string, RuleEvaluability> = {};
    for (const c of CLASSIFIED) fresh[c.ruleId] = c.evaluability;

    const drifted = Object.keys(fresh)
      .filter(id => snapshot.classes[id] !== fresh[id])
      .map(id => `${id}: snapshot says ${snapshot.classes[id] ?? '(absent)'}, triage says ${fresh[id]}`);
    const orphaned = Object.keys(snapshot.classes).filter(id => !(id in fresh));

    expect(drifted).toEqual([]);
    expect(orphaned).toEqual([]);
  });

  it('carries counts that agree with its own per-rule classes', () => {
    // A snapshot whose header disagrees with its body would let the .mjs guard
    // pass on the header while the mapping is stamped from the body.
    const tally: Record<string, number> = {};
    for (const rule of CORPUS) {
      const klass = snapshot.classes[rule.id];
      tally[klass] = (tally[klass] ?? 0) + 1;
    }
    expect(tally).toEqual(snapshot.counts);
  });
});
