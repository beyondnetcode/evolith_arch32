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
        // from DiskRulesetRepository — and while it was missing, the triage could
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
