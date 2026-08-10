import { execFile } from 'node:child_process';

import {
  PROCESS_TIMEOUT_EXIT_CODE,
  type IProcessRunner,
  type ProcessResult,
  type ProcessSpec,
} from '@beyondnet/evolith-core-domain';

/**
 * Real {@link IProcessRunner} backed by `child_process.execFile` (GT-512 · EAG-04 infra adapter).
 *
 * This is the "inner" runner that a `SandboxedProcessRunner` (core-domain) wraps. It
 * provides the Node-level hardening the sandbox seam cannot express purely:
 *  - NO shell — `execFile` with an args array, so there is no shell-injection surface.
 *  - NO ambient secrets — the child does NOT inherit `process.env`; it gets only a curated
 *    allowlist of non-secret operational vars (PATH/HOME/locale/…) so real tools (`npm`,
 *    `dotnet`, `pip`) can still resolve, PLUS whatever the spec explicitly passes. A
 *    `TOKEN`/`SECRET`/credential var in the parent env is never forwarded.
 *  - A kill-on-timeout wall-clock limit and `cwd` confinement.
 *
 * DEPLOY-GATED (intentionally NOT here): OS-level network-egress denial and cgroup/ulimit
 * isolation. Userland Node cannot guarantee those — run this ONLY inside a locked-down
 * container (no network namespace, seccomp), wrapped by `SandboxedProcessRunner`.
 */

/** Non-secret operational env keys copied from the parent so tools can run. Never secrets. */
const ENV_PASSTHROUGH: readonly string[] = [
  'PATH', 'Path', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'LC_CTYPE',
  'SystemRoot', 'windir', 'PATHEXT', 'COMSPEC', 'NUMBER_OF_PROCESSORS',
  'DOTNET_CLI_TELEMETRY_OPTOUT', 'DOTNET_NOLOGO', 'DOTNET_SKIP_FIRST_TIME_EXPERIENCE',
];

/**
 * Conventional exit code for a process killed after exceeding its timeout.
 *
 * GT-664 — taken from the port rather than declared again here. The adapter on
 * the other side of the seam reads this number to decide that a tool never
 * finished; two private copies of it could drift, and the drift would show up as
 * a timed-out scan being parsed as a completed one.
 */
const TIMEOUT_EXIT_CODE = PROCESS_TIMEOUT_EXIT_CODE;
/** Conventional exit code for "command not found"/spawn failure (ENOENT etc.). */
const SPAWN_FAILURE_EXIT_CODE = 127;

export interface NodeProcessRunnerOptions {
  /** Fallback wall-clock limit when a spec sets none. */
  readonly defaultTimeoutMs?: number;
  /** Cap on captured stdout/stderr bytes. */
  readonly maxBuffer?: number;
}

interface ExecFileError extends Error {
  readonly code?: number | string;
  readonly killed?: boolean;
  readonly signal?: NodeJS.Signals | null;
}

export class NodeProcessRunner implements IProcessRunner {
  private readonly defaultTimeoutMs: number;
  private readonly maxBuffer: number;

  constructor(options: NodeProcessRunnerOptions = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 120_000;
    this.maxBuffer = options.maxBuffer ?? 64 * 1024 * 1024;
  }

  /** Build the child env: curated non-secret parent vars + the spec's explicit env. */
  private buildEnv(spec: ProcessSpec): Record<string, string> {
    const env: Record<string, string> = {};
    for (const key of ENV_PASSTHROUGH) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
    if (spec.env) Object.assign(env, spec.env);
    return env;
  }

  run(spec: ProcessSpec): Promise<ProcessResult> {
    return new Promise<ProcessResult>((resolve) => {
      const child = execFile(
        spec.command,
        [...spec.args],
        {
          cwd: spec.cwd,
          env: this.buildEnv(spec),
          timeout: spec.timeoutMs ?? this.defaultTimeoutMs,
          maxBuffer: this.maxBuffer,
          windowsHide: true,
          shell: false,
        },
        (error: ExecFileError | null, stdout: string, stderr: string) => {
          let exitCode = 0;
          let timedOut = false;
          if (error) {
            if (error.killed && error.signal) {
              timedOut = true;
              exitCode = TIMEOUT_EXIT_CODE;
            } else if (typeof error.code === 'number') {
              exitCode = error.code;
            } else {
              exitCode = SPAWN_FAILURE_EXIT_CODE; // ENOENT / non-numeric code
            }
          }
          resolve({ exitCode, stdout: stdout ?? '', stderr: stderr ?? '', timedOut });
        },
      );
      if (spec.input !== undefined) child.stdin?.end(spec.input);
    });
  }
}
