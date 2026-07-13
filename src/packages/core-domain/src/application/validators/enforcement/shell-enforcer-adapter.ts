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
    return this.config.parse(result, ctx);
  }
}
