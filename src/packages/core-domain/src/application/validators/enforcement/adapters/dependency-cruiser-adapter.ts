/**
 * DependencyCruiserAdapter (GT-515 · EAG-09).
 *
 * The first concrete enforcer adapter, targeting Node/TS — the runtime the Core is
 * written in. dependency-cruiser has no native SARIF output at/below v16, so this
 * parses its JSON report (`depcruise --output-type json`, `summary.violations[]`)
 * into the canonical {@link Violation} model. It reuses the GT-514
 * {@link ShellEnforcerAdapter} seam, so process execution stays behind
 * {@link IProcessRunner} (hardened by GT-512).
 */

import { makeViolation, type Violation, type ViolationSeverity } from '../../../../evaluation/violation';
import { ShellEnforcerAdapter, type ShellEnforcerConfig } from '../shell-enforcer-adapter';
import type { EnforcerAnalysisContext, IProcessRunner, ProcessResult } from '../enforcer.types';

export const DEPENDENCY_CRUISER_TOOL = 'dependency-cruiser';

/** depcruise rule severities → canonical violation severity. `ignore` is dropped. */
const DEPCRUISE_SEVERITY: Readonly<Record<string, ViolationSeverity | null>> = {
  error: 'error',
  warn: 'warning',
  info: 'info',
  ignore: null,
};

/** Shape of the bits of a `depcruise --output-type json` report we consume. */
interface DepcruiseViolation {
  readonly from?: string;
  readonly to?: string;
  readonly rule?: { readonly name?: string; readonly severity?: string };
  readonly cycle?: ReadonlyArray<{ readonly name?: string } | string>;
  readonly line?: number;
  readonly column?: number;
}
interface DepcruiseReport {
  readonly summary?: { readonly violations?: readonly DepcruiseViolation[] };
}

function cyclePath(cycle: DepcruiseViolation['cycle']): string | undefined {
  if (!cycle?.length) return undefined;
  return cycle.map((n) => (typeof n === 'string' ? n : n.name)).filter(Boolean).join(' → ');
}

/**
 * Pure parser: a `depcruise --output-type json` report → canonical {@link Violation}s.
 * `from` is the offending module (file); `line`/`column` are used when present.
 * Malformed/empty input yields `[]` — zero spurious violations (GT-515 AC3 parser side).
 */
export function parseDependencyCruiserReport(stdout: string): Violation[] {
  let report: DepcruiseReport;
  try {
    report = JSON.parse(stdout || '{}');
  } catch {
    return [];
  }
  const violations = report.summary?.violations ?? [];
  const out: Violation[] = [];
  for (const v of violations) {
    const severity = DEPCRUISE_SEVERITY[v.rule?.severity ?? 'warn'] ?? (v.rule?.severity ? null : 'warning');
    if (severity === null) continue; // ignore-severity: not a violation
    const ruleId = v.rule?.name;
    const file = v.from;
    if (!ruleId || !file) continue; // cannot normalize without a rule + file
    const cycle = cyclePath(v.cycle);
    const message = v.to
      ? `${ruleId}: ${file} → ${v.to}${cycle ? ` (cycle: ${cycle})` : ''}`
      : `${ruleId}: ${file}`;
    out.push(
      makeViolation({
        ruleId,
        tool: DEPENDENCY_CRUISER_TOOL,
        file,
        line: v.line,
        column: v.column,
        severity,
        message,
      }),
    );
  }
  return out;
}

export interface DependencyCruiserOptions {
  /** Path to a `.dependency-cruiser` config, relative to the analysis cwd. */
  readonly configPath?: string;
  /** Targets to scan (default `['src']`). */
  readonly targets?: readonly string[];
}

/** Build the `depcruise --output-type json ...` invocation for a workspace. */
export function buildDependencyCruiserSpec(ctx: EnforcerAnalysisContext, options: DependencyCruiserOptions = {}) {
  const args = ['--output-type', 'json'];
  if (options.configPath) args.push('--config', options.configPath);
  args.push(...(options.targets ?? ['src']));
  return { command: DEPENDENCY_CRUISER_TOOL, args, cwd: ctx.satellitePath };
}

/**
 * Compose a dependency-cruiser {@link ShellEnforcerAdapter} over the given runner.
 * (Blocking stays disabled until a zero-FP corpus run under GT-512 — GT-515 AC3.)
 */
export function createDependencyCruiserAdapter(runner: IProcessRunner, options: DependencyCruiserOptions = {}): ShellEnforcerAdapter {
  const config: ShellEnforcerConfig = {
    tool: DEPENDENCY_CRUISER_TOOL,
    runtime: 'node',
    buildSpec: (ctx) => buildDependencyCruiserSpec(ctx, options),
    parse: (result: ProcessResult) => parseDependencyCruiserReport(result.stdout),
  };
  return new ShellEnforcerAdapter(config, runner);
}
