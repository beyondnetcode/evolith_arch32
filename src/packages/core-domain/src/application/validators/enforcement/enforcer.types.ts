/**
 * Enforcer orchestration seam (GT-514 · EAG-08).
 *
 * The ports that let external static analyzers (dependency-cruiser, Deptrac,
 * NetArchTest, import-linter, Conftest — see `enforcer-catalog.json`) plug into
 * evaluation WITHOUT displacing the native engine. Every adapter returns the
 * canonical `Violation` model (GT-511). Process execution is behind
 * {@link IProcessRunner}, the seam GT-512 hardens (restore, sandbox, no egress).
 */

import type { NormalizedRule } from '../../../domain/models/normalized-rule';
import type { Violation } from '../../../domain/violation';

/** Runtime ecosystem an enforcer needs. Selects which adapter handles a rule. */
export type EnforcerRuntime = 'node' | 'dotnet' | 'php' | 'python' | 'iac' | 'shell';

/** What an enforcer analyzes: the workspace + the enforcer rules routed to it. */
export interface EnforcerAnalysisContext {
  readonly satellitePath: string;
  readonly corePath: string;
  /** The enforcer rules (already filtered to this adapter's tool) being evaluated. */
  readonly rules: readonly NormalizedRule[];
}

/**
 * An external analyzer normalized behind one port. `analyze` runs the tool (via an
 * {@link IProcessRunner}) and returns canonical {@link Violation}s.
 */
export interface IEnforcerAdapter {
  readonly tool: string;
  readonly runtime: EnforcerRuntime;
  analyze(ctx: EnforcerAnalysisContext): Promise<Violation[]>;
}

// ---------------------------------------------------------------------------
// Process execution port (hardened by GT-512)
// ---------------------------------------------------------------------------

export interface ProcessSpec {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
  /** Optional stdin payload. */
  readonly input?: string;
}

export interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut?: boolean;
}

/**
 * Runs a subprocess. GT-514 depends only on this PORT; the production, sandboxed
 * implementation (restore, no egress, ulimits/cgroups, binary allowlist) is GT-512.
 * Core intentionally ships NO unsandboxed default runner.
 */
export interface IProcessRunner {
  run(spec: ProcessSpec): Promise<ProcessResult>;
}

/**
 * A deterministic in-memory {@link IProcessRunner} for tests and the offline default:
 * it never spawns a process. Seed it with canned results keyed by command, or a
 * single default result.
 */
export class StubProcessRunner implements IProcessRunner {
  private readonly byCommand: Map<string, ProcessResult>;
  constructor(
    private readonly defaultResult: ProcessResult = { exitCode: 0, stdout: '', stderr: '' },
    seed: Readonly<Record<string, ProcessResult>> = {},
  ) {
    this.byCommand = new Map(Object.entries(seed));
  }
  async run(spec: ProcessSpec): Promise<ProcessResult> {
    return this.byCommand.get(spec.command) ?? this.defaultResult;
  }
}
