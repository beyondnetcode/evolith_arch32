/**
 * ShellEnforcerAdapter (GT-514 · EAG-08).
 *
 * A reusable {@link IEnforcerAdapter} that shells a tool out via an
 * {@link IProcessRunner} and delegates output parsing to a per-tool parser. GT-515
 * instantiates it for dependency-cruiser (`depcruise -T json` → violations); other
 * runtimes (Deptrac, NetArchTest, import-linter, Conftest) reuse it with their own
 * `buildSpec`/`parse`. It never spawns a process itself — that is the injected runner.
 */

import type { Violation } from '../../../domain/violation';
import type {
  EnforcerAnalysisContext,
  EnforcerRuntime,
  IEnforcerAdapter,
  IProcessRunner,
  ProcessResult,
  ProcessSpec,
} from './enforcer.types';

export interface ShellEnforcerConfig {
  readonly tool: string;
  readonly runtime: EnforcerRuntime;
  /** Build the process invocation for a given analysis context. */
  buildSpec(ctx: EnforcerAnalysisContext): ProcessSpec;
  /** Map the raw process result into canonical violations. */
  parse(result: ProcessResult, ctx: EnforcerAnalysisContext): Violation[];
  /**
   * Distinguish a genuine tool FAILURE (missing binary, bad config, crash) from a clean
   * run that simply found no violations. Report-emitting tools (`depcruise -T json`, a
   * SARIF analyzer) always write their report on success, so an empty stdout means the
   * tool never ran to completion. When this returns `true`, {@link ShellEnforcerAdapter.analyze}
   * THROWS so the {@link EnforcerEvaluator} SKIPS the rule — a crashed tool must never be
   * mistaken for "0 violations → passed" (a false pass). Override per-tool when a tool can
   * legitimately emit empty output on success. Default: empty stdout ⇒ failure.
   */
  isToolFailure?(result: ProcessResult, ctx: EnforcerAnalysisContext): boolean;
}

export class ShellEnforcerAdapter implements IEnforcerAdapter {
  constructor(
    private readonly config: ShellEnforcerConfig,
    private readonly runner: IProcessRunner,
  ) {}

  get tool(): string {
    return this.config.tool;
  }

  get runtime(): EnforcerRuntime {
    return this.config.runtime;
  }

  async analyze(ctx: EnforcerAnalysisContext): Promise<Violation[]> {
    const spec = this.config.buildSpec(ctx);
    const result = await this.runner.run(spec);
    const failed = this.config.isToolFailure
      ? this.config.isToolFailure(result, ctx)
      : result.stdout.trim() === '';
    if (failed) {
      // Throw (not `return []`) so the EnforcerEvaluator records a SKIP rather than a
      // false pass: a tool that produced no parseable report never certified anything.
      throw new Error(
        `${this.config.tool} produced no parseable report (exit ${result.exitCode})` +
          `${result.stderr ? `: ${result.stderr.trim().slice(0, 200)}` : ''}`,
      );
    }
    return this.config.parse(result, ctx);
  }
}
