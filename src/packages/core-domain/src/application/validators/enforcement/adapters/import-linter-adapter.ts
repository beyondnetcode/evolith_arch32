/**
 * ImportLinterAdapter (GT-521 · EAG-24 — Python).
 *
 * import-linter (grimp-backed) enforces Python import contracts (layers / independence /
 * forbidden). It is run as `lint-imports` inside the target package and prints a text
 * report — there is no stable JSON output — so this parses the report, mapping each broken
 * contract's "X is not allowed to import Y" statement into one canonical {@link Violation}.
 * It reuses the GT-514 {@link ShellEnforcerAdapter} seam so process execution stays behind
 * {@link IProcessRunner} (hardened by GT-512).
 *
 * import-linter violations are about MODULES, not files, so `file` is `''` (the model's
 * locationless finding); the offending import chain lives in the message. `line = null`
 * (import-linter reports a module-graph edge, not a single source line).
 */

import { makeViolation, type Violation } from '../../../../domain/violation';
import { ShellEnforcerAdapter, type ShellEnforcerConfig } from '../shell-enforcer-adapter';
import type { EnforcerAnalysisContext, IProcessRunner, ProcessResult } from '../enforcer.types';

export const IMPORT_LINTER_TOOL = 'import-linter';

/** Strip ANSI colour codes — import-linter colourizes when attached to a TTY. */
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/** The run completed (parse it) iff it printed the contracts summary line. */
const SUMMARY_RE = /Contracts:\s*\d+\s*kept,\s*(\d+)\s*broken\./i;
/** A per-violation statement inside a broken contract. */
const NOT_ALLOWED_RE = /^(.+ is not allowed to import .+?):?\s*$/;

/**
 * Pure parser: an `lint-imports` report → canonical {@link Violation}s, one per
 * "X is not allowed to import Y" statement, tagged with its contract name (the `ruleId`).
 * Malformed/empty/all-kept input yields `[]` — zero spurious violations (GT-521 parser side).
 */
export function parseImportLinterReport(stdout: string): Violation[] {
  const text = stripAnsi(stdout || '');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^Broken contracts\s*$/.test(l.trim()));
  if (start < 0) return [];

  const out: Violation[] = [];
  let contract = '';
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // Contract header: a name line immediately followed by a rule of dashes.
    if (line && /^-{3,}\s*$/.test((lines[i + 1] ?? '').trim())) {
      contract = line;
      continue;
    }
    const m = NOT_ALLOWED_RE.exec(line);
    if (!m || !contract || /^-{3,}$/.test(line)) continue;
    // Collect the following import-chain bullet lines (`- a -> b (l.N)`), skipping the
    // blank line import-linter prints between the statement and its chains.
    const chains: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const c = lines[j].trim();
      if (c === '') {
        if (chains.length) break;
        continue;
      }
      if (!c.startsWith('- ')) break;
      chains.push(c.replace(/^-\s*/, ''));
    }
    const message = chains.length ? `${m[1]} (${chains.join('; ')})` : m[1];
    out.push(makeViolation({ ruleId: contract, tool: IMPORT_LINTER_TOOL, file: '', severity: 'error', message }));
  }
  return out;
}

export interface ImportLinterOptions {
  /** `.importlinter`/config path relative to the analysis cwd (import-linter's `--config`). */
  readonly configPath?: string;
}

/** Build the `lint-imports [--config <path>]` invocation for a workspace. */
export function buildImportLinterSpec(ctx: EnforcerAnalysisContext, options: ImportLinterOptions = {}) {
  const args: string[] = [];
  if (options.configPath) args.push('--config', options.configPath);
  return { command: 'lint-imports', args, cwd: ctx.satellitePath };
}

/**
 * A COMPLETED analysis always prints the "Contracts: N kept, M broken." summary; its
 * absence on a non-zero exit is a tool FAILURE (missing package / grimp error / bad
 * config) — throw ⇒ the EnforcerEvaluator SKIPs the rule rather than false-passing it.
 */
export function isImportLinterFailure(result: ProcessResult): boolean {
  const combined = stripAnsi(`${result.stdout}\n${result.stderr}`);
  const ran = SUMMARY_RE.test(combined);
  return !ran && result.exitCode !== 0;
}

/**
 * Compose an import-linter {@link ShellEnforcerAdapter} over the given runner.
 * (Blocking stays disabled until a zero-FP corpus run under GT-512.)
 */
export function createImportLinterAdapter(runner: IProcessRunner, options: ImportLinterOptions = {}): ShellEnforcerAdapter {
  const config: ShellEnforcerConfig = {
    tool: IMPORT_LINTER_TOOL,
    runtime: 'python',
    buildSpec: (ctx) => buildImportLinterSpec(ctx, options),
    parse: (result: ProcessResult) => parseImportLinterReport(result.stdout),
    isToolFailure: (result: ProcessResult) => isImportLinterFailure(result),
  };
  return new ShellEnforcerAdapter(config, runner);
}
