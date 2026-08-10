import { IProcessRunner, ProcessResult, EnforcerAnalysisContext } from '../enforcer.types';
import { ShellEnforcerAdapter, ShellEnforcerConfig } from '../shell-enforcer-adapter';
import { makeViolation } from '../../../../domain/violation';
import type { Violation } from '../../../../domain/violation';
import { describeIso5055Coverage, iso5055CoverageFromSarif } from '../../standards/iso-5055-coverage';
import {
  buildIso5055Index,
  classifySarifResult,
  cwesOfSarifResult,
  type Iso5055Index,
  type Iso5055Measure,
} from '../../standards/iso-5055-measure';
import {
  attributeCwes,
  buildEslintCweMap,
  isEslintDriver,
  withAttributedCwes,
  type EslintCweMap,
} from '../../standards/eslint-cwe-map';
import { ESLINT_CWE_MAP } from '../../standards/eslint-cwe-map.generated';
// GT-662 — COMPILED IN, not read from the corpus at runtime. The first cut
// required the JSON by relative path, which resolves in this repository and
// NOT in the shipped image (the Dockerfile copies `src/rulesets` to
// `/app/corpus/rulesets`), so core-api died at boot with MODULE_NOT_FOUND.
// The chaos drill found it: /health never answered, and from outside a
// crash-loop is indistinguishable from a slow boot.
import { ISO_5055_WEAKNESS_INDEX } from '../../standards/iso-5055-index.generated';

/**
 * GT-662 slice 2 — the adapter that turns a free scanner into an ISO/IEC 5055
 * measurement.
 *
 * Slice 1 built the translation (`CWE → weakness → measure`) and measured it
 * against this repository's real CodeQL findings: **34 of 75 open alerts are
 * weaknesses the standard names**. This is the half that lets a tenant get that
 * number from `evolith validate` instead of from a GitHub API call.
 *
 * ## Why semgrep, and why the tenant may point at a file instead
 *
 * The scanner has to be **open and free** — the owner's binding principle — and
 * it has to tag its findings with CWEs. semgrep does both and runs offline. But
 * a tenant whose CI already produces SARIF (CodeQL, ESLint's SARIF formatter,
 * another semgrep invocation) should not be made to scan twice, so
 * `enforce.config.sarif` short-circuits the run and reads that file instead.
 * Either way the parsing is identical, which is the point: **one translation,
 * many producers.**
 *
 * ## The rule ids this adapter emits against
 *
 * ISO/IEC 5055 has four measures, and the pack has one rule per measure. A
 * finding is attributed to EVERY measure its CWE belongs to — the index has 197
 * memberships over 138 distinct weaknesses, so overlap is normal and dropping it
 * would under-report shared weaknesses.
 *
 * ## What it refuses to do
 *
 * Report a pass it did not earn. A scanner that could not run throws (the
 * `EnforcerEvaluator` then SKIPs the rule) rather than returning `[]`, because
 * zero violations from a tool that never started is indistinguishable from a
 * clean repository — the failure mode this whole corpus keeps finding.
 */

/** `enforce.tool` value the pack's rules must name. */
export const ISO_5055_TOOL = 'iso-5055';

/** Measure → the pack rule id that carries it. */
export const MEASURE_RULE_IDS: Readonly<Record<Iso5055Measure, string>> = {
  Security: 'ISO5055-SEC',
  Reliability: 'ISO5055-REL',
  'Performance Efficiency': 'ISO5055-PERF',
  Maintainability: 'ISO5055-MAINT',
};

/**
 * Default semgrep ruleset.
 *
 * `p/default` is the free registry pack and resolves without an account.
 * Deliberately NOT `--config auto`, which asks the semgrep service what to run
 * and therefore needs network and a login — a governance check that silently
 * depends on a vendor session is not open and not free.
 */
export const DEFAULT_SEMGREP_CONFIG = 'p/default';

/**
 * GT-664 — which free analyser produces the SARIF.
 *
 * Not a preference list and not a fallback chain: the tenant names one, and if
 * it does not run the rule SKIPs. A chain would let a second tool answer for a
 * first that was never installed, and the report would still read as one
 * measurement.
 */
export type Iso5055Analyser = 'semgrep' | 'eslint';

/**
 * The SARIF formatter ESLint is pointed at when `eslintFormat: "sarif"`.
 *
 * ESLint ships no SARIF output of its own; `@microsoft/eslint-formatter-sarif`
 * is the free, offline one the ecosystem uses.
 *
 * It is NOT the default, and that was a measured decision rather than a taste:
 * installing it here added **38 packages**, among them a nested ESLint 8 tree
 * beside this monorepo's ESLint 9 and a `jschardet: "latest"` dependency that
 * cannot be pinned. Paying that to reformat a report ESLint can already emit is
 * a poor trade for a governance repository — and the formatter is dead weight in
 * a subtler way too: it resolves ESLint through `require.main.require('eslint')`,
 * so the copy it declares is not even the copy it uses.
 *
 * A tenant that already has it (or produces SARIF in CI) loses nothing: set
 * `eslintFormat: "sarif"`, or skip the run entirely with `enforce.config.sarif`.
 */
export const DEFAULT_ESLINT_SARIF_FORMATTER = '@microsoft/eslint-formatter-sarif';

/**
 * How ESLint is asked to report.
 *
 * `json` is ESLint's own built-in formatter: present in every version, needs no
 * package, runs offline. The adapter normalises it into the SARIF shape so that
 * `classifySarifResult` — the translation GT-662 built and tested — stays the
 * single code path. One translation, many producers.
 */
export type EslintReportFormat = 'json' | 'sarif';
export const DEFAULT_ESLINT_FORMAT: EslintReportFormat = 'json';

/**
 * Default ESLint invocation.
 *
 * A bare `eslint`, resolved through PATH. A tenant whose binary is local passes
 * `enforce.config.eslintCommand: "node_modules/.bin/eslint"` — the sandbox
 * allowlist matches on BASENAME, so a path still resolves to the same permitted
 * binary and no new name has to be allowed for it.
 */
export const DEFAULT_ESLINT_COMMAND = 'eslint';

/** Read the shared config off the rules being evaluated; first non-empty wins. */
function configOf(ctx: EnforcerAnalysisContext, key: string): string | undefined {
  for (const rule of ctx.rules) {
    const value = (rule.enforce?.config as Record<string, unknown> | undefined)?.[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

/**
 * GT-664 — ESLint's SARIF locates findings with an absolute `file://` URI, and a
 * violation that names `/Users/someone/checkout/src/db.ts` is useless in a report
 * a second person reads. CodeQL already emits repository-relative paths, so this
 * only ever changes the ESLint shape.
 */
export function relativizeSarifUri(uri: string, basePath?: string): string {
  let path = uri;
  if (path.startsWith('file://')) {
    path = path.slice('file://'.length);
    try {
      path = decodeURIComponent(path);
    } catch {
      // A malformed escape is not worth failing a measurement over; the raw
      // path is still more useful than nothing.
    }
  }
  if (basePath && basePath !== '' && path.startsWith(basePath)) {
    return path.slice(basePath.length).replace(/^[/\\]+/, '');
  }
  return path;
}

/** One file's worth of ESLint's built-in `--format json` output. */
interface EslintJsonResult {
  readonly filePath?: string;
  readonly messages?: ReadonlyArray<{ ruleId?: string | null; line?: number }>;
}

/**
 * GT-664 — normalise ESLint's built-in JSON report into the SARIF shape.
 *
 * An ACL, not a second parser. Everything downstream — attribution, the CWE →
 * measure translation, the coverage denominator — keeps working on one canonical
 * structure, so a finding from ESLint and a finding from CodeQL are compared by
 * the same code and cannot quietly diverge. The alternative was a parallel
 * ESLint-only path, which is how two producers end up disagreeing about what a
 * measure means.
 *
 * The driver is named `ESLint` because that is what the attribution gate keys
 * on, and it is true: this log came from ESLint.
 *
 * Returns `undefined` when the text is not an ESLint JSON report, so the caller
 * can tell "another format" from "an empty report".
 */
export function eslintJsonToSarif(log: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(log || '');
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;

  const ruleIds = new Set<string>();
  const results: unknown[] = [];
  for (const file of parsed as EslintJsonResult[]) {
    for (const message of file?.messages ?? []) {
      // A message with no `ruleId` is a parse error or a directive complaint,
      // not a rule verdict. It is still carried through, with no rule, so the
      // coverage report counts it among the findings it could not map rather
      // than pretending the run was smaller than it was.
      const ruleId = typeof message?.ruleId === 'string' ? message.ruleId : '';
      if (ruleId) ruleIds.add(ruleId);
      results.push({
        ruleId,
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: file?.filePath ?? '' },
              region: message?.line !== undefined ? { startLine: message.line } : undefined,
            },
          },
        ],
      });
    }
  }

  return JSON.stringify({
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'ESLint', rules: [...ruleIds].map((id) => ({ id, properties: {} })) } },
        results,
      },
    ],
  });
}

/** Optional producers a SARIF read can take into account. */
export interface Iso5055SarifOptions {
  /** The ESLint→CWE table; applied only to an ESLint run's untagged results. */
  readonly cweMap?: EslintCweMap;
  /** Repository root, used to relativise absolute SARIF locations. */
  readonly basePath?: string;
}

/**
 * Map a SARIF log to violations against the four measure rules.
 *
 * Exported because it is the whole contract: given a log, which measures does
 * this repository fail, and why. Pure — no process, no filesystem.
 */
export function iso5055ViolationsFromSarif(
  log: string,
  index: Iso5055Index,
  options: Iso5055SarifOptions = {},
): Violation[] {
  if (index.size === 0) {
    // The index is shipped in this package, so an empty one means the build is
    // broken — not that the repository is clean. Refusing here is the difference
    // between "we could not measure" and "there is nothing to report".
    throw new Error(
      'ISO/IEC 5055 weakness index did not load (size 0). Refusing to report zero ' +
        'weaknesses against an index that is not there.',
    );
  }

  let parsed: { runs?: unknown[] };
  try {
    parsed = JSON.parse(log || '{}');
  } catch {
    return [];
  }

  const out: Violation[] = [];
  let sawEslintRun = false;
  for (const run of (parsed.runs ?? []) as Array<Record<string, unknown>>) {
    const driver = (run.tool as { driver?: { name?: string; rules?: unknown[] } } | undefined)?.driver;
    const tool = driver?.name ?? ISO_5055_TOOL;
    // CodeQL keeps CWEs on the RULE, not the result, so the rule table is
    // indexed up front. A reader that only walks `results` finds nothing — that
    // is measured, not hypothetical (slice 1 found 0 of 75 that way).
    const rules = new Map<string, unknown>();
    for (const meta of (driver?.rules ?? []) as Array<{ id?: string }>) {
      if (meta?.id) rules.set(meta.id, meta);
    }

    // GT-664 — the ESLint table is a set of claims about ESLint core rule ids
    // and nothing else, so it is consulted only for a run ESLint produced.
    const map = isEslintDriver(driver?.name) ? options.cweMap : undefined;
    if (map) sawEslintRun = true;

    for (const result of (run.results ?? []) as Array<Record<string, unknown>>) {
      const ruleId = String(result.ruleId ?? '');
      const ruleMeta = rules.get(ruleId);
      const attributed = attributeCwes(ruleId, cwesOfSarifResult(result, ruleMeta), map);
      const finding = classifySarifResult(index, withAttributedCwes(result, attributed.all), ruleMeta);
      if (finding.measures.length === 0) continue; // out of scope for the standard — reported by absence, not invented

      const physical = (result.locations as Array<Record<string, never>> | undefined)?.[0]?.[
        'physicalLocation'
      ] as { artifactLocation?: { uri?: string }; region?: { startLine?: number } } | undefined;

      // GT-664 — the sentence that keeps the two kinds of evidence apart. A CWE
      // the analyser tagged itself and a CWE we inferred from a rule id are not
      // interchangeable, and the place a reader actually looks is the violation,
      // so the distinction is spelled out there rather than left to a footnote.
      const attribution =
        attributed.provenance === 'evolith-eslint-map'
          ? ` ESLint declares no CWE for any rule; this CWE was attributed by Evolith's ` +
            `hand-written ESLint→CWE table (confidence: ` +
            `${[...new Set(attributed.mapped.map((e) => e.confidence))].sort().join('/')}` +
            `${map?.isThresholdDependent(ruleId) ? ', and this rule counts against a threshold the tenant configured' : ''}` +
            `), NOT by the analyser. It is a human claim about the rule's documented behaviour.`
          : '';

      for (const measure of finding.measures) {
        out.push(
          makeViolation({
            ruleId: MEASURE_RULE_IDS[measure],
            tool,
            file: relativizeSarifUri(physical?.artifactLocation?.uri ?? '', options.basePath),
            line: physical?.region?.startLine,
            severity: 'error',
            message:
              `ISO/IEC 5055 ${measure}: ${finding.iso5055Cwes.map((c) => `CWE-${c}`).join(', ')} ` +
              `reported by ${tool} as \`${ruleId}\`.${attribution}`,
          }),
        );
      }
    }
  }
  // GT-663 — a run that found nothing is exactly when the denominator matters,
  // and exactly when the report used to be silent. Zero ISO/IEC 5055 findings
  // reads identically whether the analyser looks for all 138 weaknesses or for
  // none of them, and the second is the common case because coverage here is
  // the ANALYSER's, never the standard's.
  //
  // Emitted only on a clean run, and only once: when there ARE findings the
  // reader already has something concrete to act on, and repeating the caveat
  // per finding would train them to skip it. Non-blocking by construction — the
  // pack's rules are `blocking: false` — so this informs a verdict, never
  // decides one.
  if (out.length === 0) {
    out.push(
      makeViolation({
        ruleId: MEASURE_RULE_IDS.Security,
        tool: ISO_5055_TOOL,
        file: '',
        severity: 'warning',
        message:
          describeIso5055Coverage(iso5055CoverageFromSarif(log, index, { cweMap: options.cweMap })) +
          // GT-664 — for an ESLint run the ceiling is knowable, and a clean run
          // is exactly when a reader is most likely to over-read the silence.
          // The general advisory can only say "we do not know what the analyser
          // looks for"; here we do know: the table reaches these CWEs and no
          // others, whatever the tenant's ESLint config has enabled.
          (sawEslintRun && options.cweMap
            ? ` This run came from ESLint, whose findings carry no CWE of their own: Evolith's table ` +
              `can attribute at most ${options.cweMap.reach.length} of the ${index.size} weaknesses ` +
              `(${options.cweMap.reach.map((c) => `CWE-${c}`).join(', ')}), and only for the ` +
              `${options.cweMap.size} rules it names that the tenant's ESLint config actually enables. ` +
              `Nothing about the other ${index.size - options.cweMap.reach.length} was measured here.`
            : ''),
      }),
    );
  }

  return out;
}

/**
 * The adapter. `enforce.config` on the pack's rules may carry:
 *   - `sarif`    — path to a SARIF log the tenant's CI already produced; when
 *                  present no analyser is run.
 *   - `analyser` — `semgrep` (default) or `eslint` (GT-664). The tenant names
 *                  one; there is no fallback, because a second tool answering
 *                  for a first that was never installed would still report as
 *                  one measurement.
 *   - `semgrepConfig`  — override for `--config` (default {@link DEFAULT_SEMGREP_CONFIG}).
 *   - `eslintCommand`  — path to the ESLint binary (default {@link DEFAULT_ESLINT_COMMAND}).
 *   - `eslintFormatter`— SARIF formatter module (default {@link DEFAULT_ESLINT_SARIF_FORMATTER}).
 *   - `eslintTarget`   — what to lint (default `.`).
 */
export function createIso5055Adapter(runner: IProcessRunner): ShellEnforcerAdapter {
  const index = buildIso5055Index(ISO_5055_WEAKNESS_INDEX);
  const cweMap = buildEslintCweMap(ESLINT_CWE_MAP);

  const config: ShellEnforcerConfig = {
    tool: ISO_5055_TOOL,
    runtime: 'node',
    buildSpec: (ctx) => {
      const sarif = configOf(ctx, 'sarif');
      if (sarif) {
        // `cat` is the whole invocation on purpose: the tenant already paid for
        // the scan, and re-running one would report on a different tree than the
        // evidence they filed.
        return { command: 'cat', args: [sarif], cwd: ctx.satellitePath };
      }
      if (configOf(ctx, 'analyser') === 'eslint') {
        const sarifFormat = configOf(ctx, 'eslintFormat') === 'sarif';
        return {
          command: configOf(ctx, 'eslintCommand') ?? DEFAULT_ESLINT_COMMAND,
          args: [
            configOf(ctx, 'eslintTarget') ?? '.',
            '--format',
            sarifFormat
              ? (configOf(ctx, 'eslintFormatter') ?? DEFAULT_ESLINT_SARIF_FORMATTER)
              : DEFAULT_ESLINT_FORMAT,
          ],
          cwd: ctx.satellitePath,
        };
      }
      return {
        command: 'semgrep',
        args: [
          '--config',
          configOf(ctx, 'semgrepConfig') ?? DEFAULT_SEMGREP_CONFIG,
          '--sarif',
          '--quiet',
          '--disable-version-check',
          '.',
        ],
        cwd: ctx.satellitePath,
      };
    },
    parse: (result: ProcessResult, ctx: EnforcerAnalysisContext) =>
      iso5055ViolationsFromSarif(eslintJsonToSarif(result.stdout) ?? result.stdout, index, {
        cweMap,
        basePath: ctx.satellitePath,
      }),
    certificationGap: (ctx: EnforcerAnalysisContext) => {
      // GT-664 — the false-pass counterpart for the ESLint path. ESLint tags no
      // finding with a CWE, so with an unloaded table every finding it produces
      // is untagged, every measure comes back empty, and the run reports a clean
      // repository having certified nothing. Refuse before spawning anything.
      if (configOf(ctx, 'analyser') === 'eslint' && cweMap.size === 0) {
        return (
          'the ESLint→CWE table did not load (size 0). ESLint declares no CWE for any rule, so ' +
          'without the table nothing it reports can be attributed to a measure, and the run would ' +
          'report zero weaknesses having asked nothing.'
        );
      }
      return undefined;
    },
    isToolFailure: (result: ProcessResult) => {
      // A completed scan emits a report even when it found nothing: SARIF writes
      // a `runs` array, ESLint's built-in JSON writes an array of files (`[]` on
      // a clean tree). Neither of those is empty stdout, and empty stdout is what
      // a binary that never started leaves behind — so the adapter throws and the
      // rule SKIPs rather than passing over nothing.
      try {
        const parsed = JSON.parse(result.stdout || '');
        return !Array.isArray(parsed) && !Array.isArray((parsed as { runs?: unknown })?.runs);
      } catch {
        return true;
      }
    },
  };

  return new ShellEnforcerAdapter(config, runner);
}
