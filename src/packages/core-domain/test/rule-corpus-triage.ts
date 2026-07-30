/**
 * GT-598 — the corpus triage, extracted so it has more than one caller.
 *
 * WHY THIS FILE EXISTS
 * This code used to live inside `rule-corpus-triage.spec.ts`, where it was
 * reachable only by jest. That made `src/rulesets/standards/native-evaluability-
 * snapshot.json` impossible to CAPTURE: nothing outside the spec could ask the
 * real handler set which rules it claims, so the snapshot was maintained by
 * hand, and drifted (it still said `documentation-only: 129` after Core moved to
 * 136, and its guard could not see it because the guard re-read the snapshot's
 * own literals).
 *
 * So the measurement moved here. It has two callers now, and they are the two
 * halves of the same guarantee:
 *
 *   - `rule-corpus-triage.spec.ts` pins the numbers and asserts the committed
 *     snapshot still agrees with a freshly computed triage;
 *   - `src/rulesets/standards/capture-native-evaluability-snapshot.mjs`
 *     regenerates that snapshot from this same computation.
 *
 * It lives under `test/` rather than `src/` deliberately: it walks the
 * repository with `fs`, which is not something the published application layer
 * should do, and `files: ["dist"]` keeps it out of the package.
 *
 * Nothing here is mocked. The handler set is the real {@link NativeEvaluator}
 * one, asked only which rules it CLAIMS — no evaluation, no I/O.
 */

import * as fs from 'fs';
import * as path from 'path';
import { NativeEvaluator } from '../src/application/validators/evaluators/native-evaluator';
import { INativeRuleHandler } from '../src/application/validators/evaluators/handlers/rule-handler.interface';
import { NormalizedRule } from '../src/domain/models/normalized-rule';
import {
  ADR_CONFORMANCE_CATEGORY,
  ClassifiedRule,
  EvaluabilitySummary,
  RuleEvaluability,
  classifyRule,
  summarizeEvaluability,
} from '../src/application/validators/rule-evaluability';

/** Repository root, from this file's location (`<repo>/src/packages/core-domain/test`). */
export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const RULESETS_ROOT = path.join(REPO_ROOT, 'src', 'rulesets');

// ---------------------------------------------------------------------------
// Load the corpus exactly as DiskRulesetRepository does, minus the schema pass
// (this measures classification, not schema conformance).
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

export function loadCorpus(rulesetsRoot: string = RULESETS_ROOT): NormalizedRule[] {
  const rules: NormalizedRule[] = [];
  for (const file of rulesetFiles(rulesetsRoot)) {
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
        // from DiskRulesetRepository — and while it was missing, this measurement
        // could not see the four rules that carry a machine-readable check, so it
        // counted them as handler backlog. A loader that drops a field the
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
export function handlerSet(): INativeRuleHandler[] {
  const evaluator = new NativeEvaluator({} as never, {} as never, {} as never);
  return (evaluator as unknown as { handlers: INativeRuleHandler[] }).handlers;
}

export interface CorpusTriage {
  readonly corpus: readonly NormalizedRule[];
  readonly classified: readonly ClassifiedRule[];
  readonly summary: EvaluabilitySummary;
  /** A handler claims the rule — it is routed somewhere instead of falling through. */
  readonly claims: (rule: NormalizedRule) => boolean;
  /** A handler claims the rule AND can return a verdict for it. */
  readonly evaluates: (rule: NormalizedRule) => boolean;
}

/**
 * Classify the whole corpus with the real handler set.
 *
 * {@link import('../src/application/validators/evaluators/handlers/adr-conformance-rule.handler').AdrConformanceRuleHandler}
 * is deliberately excluded from `evaluates`: it claims the generated ADR rules
 * only to CLASSIFY them, and never returns `passed`. Counting "claimed" as
 * "evaluated" would reproduce, one layer up, exactly the false green GT-569
 * removed — so `evaluates`, not `claims`, drives the breakdown.
 */
export function triageCorpus(rulesetsRoot: string = RULESETS_ROOT): CorpusTriage {
  const corpus = loadCorpus(rulesetsRoot);
  const handlers = handlerSet();

  const claims = (rule: NormalizedRule) => handlers.some(h => h.canHandle(rule));
  const evaluates = (rule: NormalizedRule) => claims(rule) && rule.category !== ADR_CONFORMANCE_CATEGORY;

  const classified: ClassifiedRule[] = corpus.map(rule => {
    const { evaluability, why } = classifyRule(rule, evaluates(rule));
    return { ruleId: rule.id, sourceFile: rule.sourceFile, blocking: rule.blocking, evaluability, why };
  });

  return { corpus, classified, summary: summarizeEvaluability(classified), claims, evaluates };
}

// ---------------------------------------------------------------------------
// The rendered capture — ONE renderer, two callers
// ---------------------------------------------------------------------------

/**
 * GT-633 reconciliation: this function had TWO implementations.
 *
 * The fix for GT-633 was written twice, in parallel, by sessions that could not
 * see each other. One shipped a standalone capture script (`capture-native-
 * evaluability-snapshot.mjs`, reachable by the derived-artifact chain guard and
 * by the documentation job); the other rendered the document inside
 * `rule-corpus-triage.spec.ts`, where jest can pin it byte-for-byte. Both were
 * right about their half, and both recaptured the same numbers.
 *
 * But two generators for one artifact is EXACTLY the defect GT-633 exists to
 * remove, reproduced one level up: whichever ran last would win, and the other's
 * `--check` would go red for no reason a reader could see.
 *
 * So the document is rendered HERE, once, and both callers use it:
 *   - `rule-corpus-triage.spec.ts` pins it byte-for-byte (it can recompute);
 *   - `capture-native-evaluability-snapshot.mjs` writes it and `--check`s it,
 *     which is what the GT-630 chain and `docs.yml` invoke.
 *
 * `capturedOn` is deliberately STICKY: it is passed in by the caller from the
 * committed document when the classification has not moved, so replaying the
 * chain stays byte-identical instead of rewriting a date on every run.
 */
export const SNAPSHOT_SHAPE_VERSION = '1.1.0';

/** One reading order for the six classes, shared by `counts` and `validation`. */
export const CLASS_ORDER: readonly RuleEvaluability[] = [
  'native-handler',
  'documentation-only',
  'unimplemented-native',
  'needs-external-system',
  'needs-runtime',
  'underspecified',
];

export interface SnapshotRenderOptions {
  /** Carried forward from the committed file while the classification is unchanged. */
  readonly capturedOn: string;
}

/** The snapshot document, as bytes, straight from a live triage. */
export function renderSnapshot(triage: CorpusTriage, { capturedOn }: SnapshotRenderOptions): string {
  const counts: Record<string, number> = {};
  for (const klass of CLASS_ORDER) counts[klass] = triage.summary.byClass[klass];

  const classes: Record<string, RuleEvaluability> = {};
  for (const c of triage.classified) classes[c.ruleId] = c.evaluability;

  const doc = {
    $id: 'https://evolith.dev/rulesets/standards/native-evaluability-snapshot.json',
    title: 'Native-engine evaluability class per rule (snapshot)',
    description:
      'Per-rule evaluability class as computed by the Core native evaluator triage. This is a GENERATED CAPTURE, not the source of truth: the authority is src/packages/core-domain/src/application/validators/rule-evaluability.ts and the handler set registered in native-evaluator.ts. It is recorded here so the ISO/IEC 5055 mapping can be scoped to the real handler backlog without src/rulesets depending on a package it does not own. Do not hand-edit — regenerate.',
    version: SNAPSHOT_SHAPE_VERSION,
    capturedOn,
    capturedFrom: [
      'src/packages/core-domain/src/application/validators/rule-evaluability.ts (RULE_TRIAGE, classifyRule, ADR_CONFORMANCE_CATEGORY)',
      'src/packages/core-domain/src/application/validators/evaluators/native-evaluator.ts (registered handler set)',
      'src/packages/core-domain/src/application/validators/evaluators/handlers/**/*.ts (canHandle predicates)',
      'src/packages/core-domain/test/rule-corpus-triage.ts (corpus loader, classification and this renderer)',
    ],
    regenerateWith: 'node src/rulesets/standards/capture-native-evaluability-snapshot.mjs',
    validation: `Rendered by test/rule-corpus-triage.ts from the live triage, written by capture-native-evaluability-snapshot.mjs and pinned byte-for-byte by rule-corpus-triage.spec.ts, so a divergence between this file and Core is a failing test rather than silent drift (corpus ${triage.summary.total}; ${CLASS_ORDER.map(k => `${k} ${triage.summary.byClass[k]}`).join(', ')}).`,
    // Both numbers, because they are not the same question — and the
    // documentation-job guard asserts on them. `corpusSize` is what Core
    // classified and what `counts` sums to; `distinctRuleIds` is how many keys
    // `classes` can hold. They differ exactly when one rule id appears in more
    // than one ruleset file, and a guard that assumed they were equal would go
    // red on a corpus change that is not drift.
    corpusSize: triage.corpus.length,
    distinctRuleIds: Object.keys(classes).length,
    counts,
    classes,
  };

  return JSON.stringify(doc, null, 2) + '\n';
}
