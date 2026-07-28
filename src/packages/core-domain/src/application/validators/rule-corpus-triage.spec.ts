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
 *  - the handler backlog is **60 rules**, not 240;
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
    expect(SUMMARY.byClass).toEqual({
      'native-handler': 139,
      'documentation-only': 136,
      'unimplemented-native': 60,
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
    const adrConformance = CORPUS.filter(r => r.category === 'adr-conformance');
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
    const adrIds = new Set(CORPUS.filter(r => r.category === 'adr-conformance').map(r => r.id));
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
