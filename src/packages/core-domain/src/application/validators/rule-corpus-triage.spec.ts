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
import { NativeEvaluator } from './evaluators/native-evaluator';
import { INativeRuleHandler } from './evaluators/handlers/rule-handler.interface';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import {
  ClassifiedRule,
  RULE_TRIAGE,
  RuleEvaluability,
  classifyRule,
  isNonExecutable,
  summarizeEvaluability,
} from './rule-evaluability';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const RULESETS_ROOT = path.join(REPO_ROOT, 'src', 'rulesets');

// ---------------------------------------------------------------------------
// Load the corpus exactly as DiskRulesetRepository does, minus the schema pass
// (this suite measures classification, not schema conformance).
// ---------------------------------------------------------------------------

function rulesetFiles(dir: string, depth = 0): string[] {
  if (depth > 4) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    if (entry.endsWith('.rules.json')) { out.push(full); continue; }
    if (!entry.includes('.') && fs.statSync(full).isDirectory()) out.push(...rulesetFiles(full, depth + 1));
  }
  return out;
}

const CATEGORY_BY_PREFIX: Record<string, string> = {
  inh: 'inheritance', acl: 'anti-corruption', ocb: 'open-core', gov: 'governance',
  evd: 'identity', 'obs-evd': 'tracing', dep: 'version-pinning', tax: 'naming-conventions',
  hxa: 'layer-structure', git: 'branch-naming', cicd: 'ci-cd', tpy: 'testing-pyramid',
  mtn: 'multi-tenancy', prot: 'protocol', runt: 'multi-runtime', dora: 'metrics',
  space: 'metrics', drift: 'governance', 'cli-rr': 'build', 'cli-par': 'shared-logic',
  mcp: 'protocol', 'modular-monolith': 'topology', 'distributed-modules': 'module-autonomy',
  microservices: 'autonomous-deployment',
};

function deriveCategory(raw: Record<string, unknown>): string {
  if (raw['category']) return String(raw['category']);
  const prefix = String(raw['id'] ?? '')
    .replace(/-(?:EVD|RR|PAR)-?\d*$/, '')
    .replace(/-\d+$/, '')
    .toLowerCase();
  return CATEGORY_BY_PREFIX[prefix] ?? 'general';
}

function deriveSeverity(raw: Record<string, unknown>): NormalizedRule['severity'] {
  const declared = String(raw['severity'] ?? '').toUpperCase().trim();
  if (declared === 'MUST NOT') return 'MUST NOT';
  if (declared === 'MUST') return 'MUST';
  if (declared === 'SHOULD') return 'SHOULD';
  if (declared === 'COULD' || declared === 'MAY') return 'COULD';
  return raw['blocking'] === true || raw['enforcement'] ? 'MUST' : 'SHOULD';
}

function loadCorpus(): NormalizedRule[] {
  const rules: NormalizedRule[] = [];
  for (const file of rulesetFiles(RULESETS_ROOT)) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const list = (parsed['rules'] ?? parsed['principles']) as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(list)) continue;
    if (list.length > 0 && !list[0]['id'] && list[0]['rules']) continue;

    for (const raw of list.filter(r => Boolean(r['id']))) {
      // `blocking` defaults from the RAW severity string, exactly as
      // DiskRulesetRepository.defaultBlocking does — NOT from the normalized
      // severity, which promotes `enforcement`-bearing rules to MUST.
      const rawSeverity = String(raw['severity'] ?? '').toUpperCase();
      rules.push({
        id: String(raw['id']),
        severity: deriveSeverity(raw),
        category: deriveCategory(raw),
        title: String(raw['title'] ?? raw['principle'] ?? raw['id']),
        description: String(raw['description'] ?? raw['statement'] ?? ''),
        blocking: Boolean(raw['blocking'] ?? (rawSeverity === 'MUST' || rawSeverity === 'MUST NOT')),
        validationQuery: raw['validationQuery'] ? String(raw['validationQuery']) : undefined,
        // GT-632: `enforce` was missing here for the same reason it was missing
        // from DiskRulesetRepository — and while it was missing, this suite could
        // not see the four rules that carry a machine-readable check, so it
        // measured them as handler backlog. A loader that drops a field the
        // handlers dispatch on does not "load the corpus exactly as
        // DiskRulesetRepository does"; it measures a different corpus.
        enforce: raw['enforce'] as NormalizedRule['enforce'],
        sourceFile: path.relative(REPO_ROOT, file),
      });
    }
  }
  return rules;
}

/** The real handler set, asked only which rules it CLAIMS (no I/O performed). */
function handlerSet(): INativeRuleHandler[] {
  const evaluator = new NativeEvaluator({} as never, {} as never, {} as never);
  return (evaluator as unknown as { handlers: INativeRuleHandler[] }).handlers;
}

const CORPUS = loadCorpus();
const HANDLERS = handlerSet();

/** A handler claims the rule — it is routed somewhere instead of falling through. */
const claims = (rule: NormalizedRule) => HANDLERS.some(h => h.canHandle(rule));

/**
 * A handler claims the rule AND can return a verdict for it.
 *
 * {@link AdrConformanceRuleHandler} is deliberately excluded: it claims the 126
 * generated rules only to CLASSIFY them, and never returns `passed`. Counting
 * "claimed" as "evaluated" would reproduce, one layer up, exactly the false
 * green GT-569 removed — so this predicate, not `claims`, drives the breakdown.
 */
const evaluates = (rule: NormalizedRule) => claims(rule) && rule.category !== 'adr-conformance';

const CLASSIFIED: ClassifiedRule[] = CORPUS.map(rule => {
  const { evaluability, why } = classifyRule(rule, evaluates(rule));
  return { ruleId: rule.id, sourceFile: rule.sourceFile, blocking: rule.blocking, evaluability, why };
});

const SUMMARY = summarizeEvaluability(CLASSIFIED);

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
    expect(SUMMARY.byClass).toEqual({
      'native-handler': 151,
      'documentation-only': 136,
      'unimplemented-native': 48,
      'needs-external-system': 20,
      'needs-runtime': 17,
      underspecified: 14,
    });
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
    const unclaimed = CORPUS.filter(r => !claims(r));
    expect(unclaimed).toHaveLength(102);

    // ...and every one of the 133 ADR-conformance rules is now claimed.
    // 126 -> 133 on 2026-07-28: the committed corpus was seven rulesets behind
    // its generator (ADR-0118 plus the six security standards 0119..0124), which
    // regenerating for GT-571 surfaced.
    const adrConformance = CORPUS.filter(r => r.category === 'adr-conformance');
    expect(adrConformance).toHaveLength(133);
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
