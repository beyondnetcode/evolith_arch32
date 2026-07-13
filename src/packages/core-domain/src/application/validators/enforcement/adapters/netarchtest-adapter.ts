/**
 * NetArchTestAdapter (GT-524 · axis 2 — positioning §13.2).
 *
 * The second concrete enforcer adapter, targeting .NET — the suite's PRIMARY runtime
 * (UMS/Tracker/MMS are .NET clean/hexagonal), which had no architecture enforcer while
 * only Node/TS (GT-515) did. NetArchTest is a fluent assertion library run INSIDE a
 * test project, so there is no standalone JSON report: this parses the `dotnet test`
 * console output, mapping each FAILED architecture test into one canonical
 * {@link Violation}. It reuses the GT-514 {@link ShellEnforcerAdapter} seam, so process
 * execution stays behind {@link IProcessRunner} (hardened by GT-512).
 *
 * NetArchTest violations are about TYPES/namespaces, not files, so `file` is `''`
 * (the model's locationless finding) — the offending types live in the message.
 *
 * Verifiable now: the pure parser + the adapter seam (unit-tested with a canned
 * `dotnet test` transcript via {@link StubProcessRunner}). BLOCKED by GT-512: a real
 * `dotnet test` run against a restored .NET checkout, and the 0-false-positive gate
 * against a real .NET corpus before any merge blocking.
 */

import { makeViolation, type Violation } from '../../../../domain/violation';
import { ShellEnforcerAdapter, type ShellEnforcerConfig } from '../shell-enforcer-adapter';
import type { EnforcerAnalysisContext, IProcessRunner, ProcessResult } from '../enforcer.types';

export const NETARCHTEST_TOOL = 'NetArchTest';

/**
 * A `dotnet test` per-test failure line: `  Failed <FullTestName> [<n> ms]` (also `X <name> [..]`).
 * The duration bracket tolerates the sub-millisecond form dotnet emits (`[< 1 ms]`) and
 * second units (`[1 s]`) — otherwise a very fast failed test would be silently missed.
 */
const FAILED_TEST_RE = /^\s*(?:X\s+|Failed\s+)(.+?)\s+\[\s*(?:<\s*)?[\d.,]+\s*m?s\s*\]\s*$/;
/** Boundaries that end an `Error Message:` block. */
const MESSAGE_BOUNDARY_RE = /^\s*(?:Stack Trace:|Standard Output|Standard Error|X\s|Failed\s|Passed\s)/;
/** Markers proving a test run actually completed (vs a build/restore break). */
const TEST_RAN_RE = /Passed!|Failed!|Total tests:|Test Run (?:Successful|Failed)/i;
/** Markers of a build/restore break — a tool FAILURE, not "0 violations". */
const BUILD_BROKE_RE = /Build FAILED|MSBUILD : error|error CS\d+|error MSB\d+|No test source files|Couldn't find a project/i;

/**
 * Pure parser: `dotnet test` console output → canonical {@link Violation}s, one per
 * failed architecture test. The test's full name is the `ruleId`; the `Error Message:`
 * block (the failing types NetArchTest reports) becomes the message. Severity is always
 * `error` — a failed architecture assertion blocks. The summary line (`Failed! - Failed: N`)
 * is NOT a per-test line (no trailing `[.. ms]`) so it is never mis-parsed.
 * Malformed/empty/clean input yields `[]` — zero spurious violations (GT-524 parser side).
 */
export function parseNetArchTestReport(stdout: string): Violation[] {
  const lines = (stdout || '').split(/\r?\n/);
  const out: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = FAILED_TEST_RE.exec(lines[i]);
    if (!m) continue;
    const ruleId = m[1].trim();
    if (!ruleId) continue;
    let message = ruleId;
    for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
      if (!/^\s*Error Message:\s*$/.test(lines[j])) continue;
      const msgLines: string[] = [];
      for (let k = j + 1; k < lines.length; k++) {
        if (MESSAGE_BOUNDARY_RE.test(lines[k])) break;
        if (lines[k].trim() === '') {
          if (msgLines.length) break;
          continue;
        }
        msgLines.push(lines[k].trim());
      }
      if (msgLines.length) message = `${ruleId}: ${msgLines.join(' ')}`;
      break;
    }
    out.push(makeViolation({ ruleId, tool: NETARCHTEST_TOOL, file: '', severity: 'error', message }));
  }
  return out;
}

export interface NetArchTestOptions {
  /** Test project or solution to run (relative to the analysis cwd). Default: the whole workspace. */
  readonly project?: string;
  /**
   * `dotnet test --filter` expression selecting the architecture tests.
   * Default `Category=Architecture`; pass `null` to run every test.
   */
  readonly filter?: string | null;
}

/** Build the `dotnet test ... --logger console` invocation for a workspace. */
export function buildNetArchTestSpec(ctx: EnforcerAnalysisContext, options: NetArchTestOptions = {}) {
  const args = ['test'];
  if (options.project) args.push(options.project);
  args.push('--nologo', '--verbosity', 'quiet');
  const filter = options.filter === undefined ? 'Category=Architecture' : options.filter;
  if (filter) args.push('--filter', filter);
  args.push('--logger', 'console;verbosity=normal');
  return { command: 'dotnet', args, cwd: ctx.satellitePath };
}

/**
 * Distinguish a completed test run (parse it — even 0/N failures) from a build/restore
 * break (throw ⇒ the {@link ShellEnforcerAdapter} makes the EnforcerEvaluator SKIP the
 * rule, never a false pass). `dotnet test` always prints a summary on a real run, so
 * "no summary + non-zero exit" — or an explicit build error — is a tool failure.
 */
export function isNetArchTestFailure(result: ProcessResult): boolean {
  const combined = `${result.stdout}\n${result.stderr}`;
  const ranTests = TEST_RAN_RE.test(combined);
  if (BUILD_BROKE_RE.test(combined) && !ranTests) return true;
  return !ranTests && result.exitCode !== 0;
}

/**
 * Compose a NetArchTest {@link ShellEnforcerAdapter} over the given runner.
 * (Blocking stays disabled until a zero-FP corpus run under GT-512 — GT-524 AC2.)
 */
export function createNetArchTestAdapter(runner: IProcessRunner, options: NetArchTestOptions = {}): ShellEnforcerAdapter {
  const config: ShellEnforcerConfig = {
    tool: NETARCHTEST_TOOL,
    runtime: 'dotnet',
    buildSpec: (ctx) => buildNetArchTestSpec(ctx, options),
    parse: (result: ProcessResult) => parseNetArchTestReport(result.stdout),
    isToolFailure: (result: ProcessResult) => isNetArchTestFailure(result),
  };
  return new ShellEnforcerAdapter(config, runner);
}
