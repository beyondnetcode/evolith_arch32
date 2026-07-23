/**
 * HarnessProcessAdapter — the REAL {@link IHarnessPort}. It discovers
 * capabilities from `.harness/manifest.yaml` and EXECUTES them as child
 * processes (`node <entry>`, the bundled `opa`, or a shell command), capturing
 * stdout/stderr and parsing JSON output when present.
 *
 * `.harness` stays the official, governed executor — this adapter merely shells
 * out to it. Swapping process execution for a sandboxed/remote runner is a new
 * adapter; the runtime is untouched.
 *
 * Tenant/product/initiative context is passed as an ENV payload, never embedded
 * in `.harness` (design rule #8). Args are passed both as a JSON env var and as
 * a trailing `--args <json>` argv, so scripts can read whichever they prefer.
 */

import { spawn } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import type {
  HarnessExecutionRequest,
  HarnessExecutionResult,
  IHarnessPort,
} from '../../domain/ports/harness.port';
import type { HarnessCapability } from '../../domain/contracts/capability';
import { loadManifest, type HarnessCapabilityRuntime } from './harness-manifest';

export interface HarnessProcessOptions {
  /** Path to the `.harness` directory (default: '<cwd>/.harness'). */
  readonly harnessRoot?: string;
  /** Working directory scripts run in (default: process.cwd()). */
  readonly cwd?: string;
  /** Manifest filename inside harnessRoot (default: 'manifest.yaml'). */
  readonly manifestFile?: string;
  /** Per-execution timeout in ms (default: 120_000). */
  readonly timeoutMs?: number;
  /** Node executable (default: process.execPath). */
  readonly nodePath?: string;
}

export class HarnessProcessAdapter implements IHarnessPort {
  private readonly harnessRoot: string;
  private readonly cwd: string;
  private readonly manifestFile: string;
  private readonly timeoutMs: number;
  private readonly nodePath: string;
  private cache?: HarnessCapabilityRuntime[];

  constructor(options: HarnessProcessOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.harnessRoot = options.harnessRoot ?? join(this.cwd, '.harness');
    this.manifestFile = options.manifestFile ?? 'manifest.yaml';
    this.timeoutMs = options.timeoutMs ?? 120_000;
    this.nodePath = options.nodePath ?? process.execPath;
  }

  private manifest(): HarnessCapabilityRuntime[] {
    if (!this.cache) this.cache = loadManifest(this.harnessRoot, this.manifestFile);
    return this.cache;
  }

  async discover(): Promise<readonly HarnessCapability[]> {
    return this.manifest();
  }

  async describe(capability: string): Promise<HarnessCapability | undefined> {
    return this.manifest().find((c) => c.name === capability);
  }

  async execute(request: HarnessExecutionRequest): Promise<HarnessExecutionResult> {
    const cap = this.manifest().find((c) => c.name === request.capability);
    if (!cap) {
      return {
        ok: false,
        capability: request.capability,
        exitCode: 127,
        stderr: `Capability '${request.capability}' not declared in ${this.manifestFile}.`,
      };
    }
    if (!cap.entry) {
      return { ok: false, capability: cap.name, exitCode: 2, stderr: `Capability '${cap.name}' has no entry.` };
    }

    const { command, args } = this.resolveCommand(cap, request);
    const startedAt = Date.now();
    const env = {
      ...process.env,
      AGENT_RUNTIME_ARGS: JSON.stringify(request.args ?? {}),
      AGENT_RUNTIME_CONTEXT: JSON.stringify(request.context ?? {}),
      AGENT_RUNTIME_DRY_RUN: request.dryRun ? '1' : '0',
    };

    return await new Promise<HarnessExecutionResult>((resolve) => {
      const child = spawn(command, args, { cwd: this.cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
      // Pass args via stdin for shell runner to prevent command injection (CWE-78)
      if (cap.runner === 'shell') {
        child.stdin?.write(JSON.stringify(request.args ?? {}));
        child.stdin?.end();
      }
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => child.kill('SIGKILL'), this.timeoutMs);

      child.stdout?.on('data', (d) => (stdout += d.toString()));
      child.stderr?.on('data', (d) => (stderr += d.toString()));
      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ ok: false, capability: cap.name, exitCode: -1, stderr: String(err) });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          ok: code === 0,
          capability: cap.name,
          exitCode: code ?? -1,
          stdout,
          stderr,
          data: this.tryJson(stdout),
          durationMs: Date.now() - startedAt,
        });
      });
    });
  }

  private resolveCommand(
    cap: HarnessCapabilityRuntime,
    request: HarnessExecutionRequest,
  ): { command: string; args: string[] } {
    const entryPath = isAbsolute(cap.entry as string)
      ? (cap.entry as string)
      : join(this.cwd, cap.entry as string);
    const argsJson = JSON.stringify(request.args ?? {});

    switch (cap.runner) {
      case 'opa':
        // Entry is the opa binary; args are forwarded verbatim if provided.
        return { command: entryPath, args: this.opaArgs(request) };
      case 'shell':
        // Pass args via stdin (not string interpolation) to prevent command injection (CWE-78).
        // The shell script should read from stdin or $AGENT_RUNTIME_ARGS env var.
        return { command: entryPath, args: [] };
      case 'node':
      default:
        return { command: this.nodePath, args: [entryPath, '--args', argsJson] };
    }
  }

  private opaArgs(request: HarnessExecutionRequest): string[] {
    const a = request.args ?? {};
    const sub = Array.isArray((a as Record<string, unknown>).argv)
      ? ((a as Record<string, unknown>).argv as unknown[]).map(String)
      : [];
    return sub.length > 0 ? sub : ['version'];
  }

  private tryJson(stdout: string): Record<string, unknown> | undefined {
    const trimmed = stdout.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
    } catch {
      return undefined;
    }
  }
}
