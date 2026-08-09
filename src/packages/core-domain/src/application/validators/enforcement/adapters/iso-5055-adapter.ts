import { IProcessRunner, ProcessResult, EnforcerAnalysisContext } from '../enforcer.types';
import { ShellEnforcerAdapter, ShellEnforcerConfig } from '../shell-enforcer-adapter';
import { makeViolation } from '../../../../domain/violation';
import type { Violation } from '../../../../domain/violation';
import {
  buildIso5055Index,
  classifySarifResult,
  type Iso5055Index,
  type Iso5055Measure,
} from '../../standards/iso-5055-measure';
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

/** Read the shared config off the rules being evaluated; first non-empty wins. */
function configOf(ctx: EnforcerAnalysisContext, key: string): string | undefined {
  for (const rule of ctx.rules) {
    const value = (rule.enforce?.config as Record<string, unknown> | undefined)?.[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return undefined;
}

/**
 * Map a SARIF log to violations against the four measure rules.
 *
 * Exported because it is the whole contract: given a log, which measures does
 * this repository fail, and why. Pure — no process, no filesystem.
 */
export function iso5055ViolationsFromSarif(log: string, index: Iso5055Index): Violation[] {
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

    for (const result of (run.results ?? []) as Array<Record<string, unknown>>) {
      const ruleId = String(result.ruleId ?? '');
      const finding = classifySarifResult(index, result, rules.get(ruleId));
      if (finding.measures.length === 0) continue; // out of scope for the standard — reported by absence, not invented

      const physical = (result.locations as Array<Record<string, never>> | undefined)?.[0]?.[
        'physicalLocation'
      ] as { artifactLocation?: { uri?: string }; region?: { startLine?: number } } | undefined;

      for (const measure of finding.measures) {
        out.push(
          makeViolation({
            ruleId: MEASURE_RULE_IDS[measure],
            tool,
            file: physical?.artifactLocation?.uri ?? '',
            line: physical?.region?.startLine,
            severity: 'error',
            message:
              `ISO/IEC 5055 ${measure}: ${finding.iso5055Cwes.map((c) => `CWE-${c}`).join(', ')} ` +
              `reported by ${tool} as \`${ruleId}\`.`,
          }),
        );
      }
    }
  }
  return out;
}

/**
 * The adapter. `enforce.config` on the pack's rules may carry:
 *   - `sarif`   — path to a SARIF log the tenant's CI already produced; when
 *                 present the scanner is NOT run.
 *   - `semgrepConfig` — override for `--config` (default {@link DEFAULT_SEMGREP_CONFIG}).
 */
export function createIso5055Adapter(runner: IProcessRunner): ShellEnforcerAdapter {
  const index = buildIso5055Index(ISO_5055_WEAKNESS_INDEX);

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
    parse: (result: ProcessResult) => iso5055ViolationsFromSarif(result.stdout, index),
    isToolFailure: (result: ProcessResult) => {
      // A completed scan emits a SARIF log with a `runs` array even when it found
      // nothing. Its absence means the scanner never ran to completion, and the
      // adapter must throw so the rule SKIPs rather than passing over nothing.
      try {
        return !Array.isArray(JSON.parse(result.stdout || '{}')?.runs);
      } catch {
        return true;
      }
    },
  };

  return new ShellEnforcerAdapter(config, runner);
}
