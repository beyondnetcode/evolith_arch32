/**
 * Evaluation-environment provisioning — contracts, policy & cache (GT-512 · EAG-04).
 *
 * Source-analyzers (GT-514/GT-515/GT-521) need a checkout that is RESTORED (deps
 * installed), project-SCOPED, CACHED by commit, and run inside a hardened SANDBOX.
 * This module ships the verifiable, pure pieces of that: the restore-plan and
 * project-scope builders (PA-01/PA-02), the SHA-keyed cache (PA-03), and the sandbox
 * POLICY + enforcement wrapper (PA-04) that hardens the GT-514 {@link IProcessRunner}.
 *
 * What is intentionally NOT here (infra, gated): the OS-level enforcement of egress
 * denial / cgroups / namespaces and the actual execution of the restore. Those live
 * in an infra adapter that implements {@link IProcessRunner}; this layer decides WHAT
 * may run and rejects everything else fail-closed BEFORE delegating.
 */

import { createHash } from 'node:crypto';

import type { EnforcerRuntime, IProcessRunner, ProcessResult, ProcessSpec } from './enforcer.types';

// ---------------------------------------------------------------------------
// PA-01 Restore
// ---------------------------------------------------------------------------

/** Ordered restore commands to install dependencies for a runtime before analysis. */
export function buildRestorePlan(runtime: EnforcerRuntime): ProcessSpec[] {
  switch (runtime) {
    case 'node':
      return [{ command: 'npm', args: ['ci'] }];
    case 'dotnet':
      return [
        { command: 'dotnet', args: ['restore'] },
        { command: 'dotnet', args: ['build', '--no-restore'] },
      ];
    case 'python':
      return [
        { command: 'pip', args: ['install', '-r', 'requirements.txt'] },
        { command: 'pip', args: ['install', 'grimp'] },
      ];
    case 'php':
      return [{ command: 'composer', args: ['install', '--no-interaction'] }];
    case 'iac':
    case 'shell':
      return []; // nothing to restore
  }
}

// ---------------------------------------------------------------------------
// PA-02 Project scoping (Nx-style: analyze only affected projects)
// ---------------------------------------------------------------------------

export interface ProjectScope {
  /** Project roots affected by the changed files (a subset of `projectRoots`). */
  readonly projects: readonly string[];
  /** True when nothing maps to a known project (caller may fall back to whole-repo). */
  readonly unscoped: boolean;
}

/** Normalize a path for prefix comparison (posix separators, strip `./`). */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Map changed files to the affected project roots (longest-prefix match). Scoping the
 * analysis to affected projects is both correct (whole-repo is wrong-scoped) and fast.
 */
export function resolveProjectScope(changedFiles: readonly string[], projectRoots: readonly string[]): ProjectScope {
  const roots = projectRoots.map(normalizePath).sort((a, b) => b.length - a.length); // longest first
  const hit = new Set<string>();
  for (const raw of changedFiles) {
    const file = normalizePath(raw);
    const root = roots.find((r) => file === r || file.startsWith(`${r}/`));
    if (root) hit.add(root);
  }
  const projects = [...hit].sort();
  return { projects, unscoped: projects.length === 0 };
}

// ---------------------------------------------------------------------------
// PA-03 Cache (keyed by commit-SHA + changed-files scope)
// ---------------------------------------------------------------------------

/**
 * Deterministic cache key for an EvaluationResult: a commit SHA plus the sorted set of
 * changed files (and optional extra discriminators, e.g. ruleset version). Re-evaluating
 * the SAME commit with the SAME scope reproduces the key → a cache hit.
 */
export function computeEvaluationCacheKey(
  commitSha: string,
  changedFiles: readonly string[] = [],
  extra: readonly string[] = [],
): string {
  const material = [
    commitSha.trim(),
    [...new Set(changedFiles.map(normalizePath))].sort().join(','),
    [...extra].sort().join(','),
  ].join('\n');
  return createHash('sha256').update(material).digest('hex').slice(0, 32);
}

export interface IEvaluationCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  has(key: string): boolean;
}

/** Zero-infra in-memory cache; a durable/Redis-backed cache is a sibling adapter. */
export class InMemoryEvaluationCache<T> implements IEvaluationCache<T> {
  private readonly store = new Map<string, T>();
  get(key: string): T | undefined {
    return this.store.get(key);
  }
  set(key: string, value: T): void {
    this.store.set(key, value);
  }
  has(key: string): boolean {
    return this.store.has(key);
  }
}

// ---------------------------------------------------------------------------
// PA-04 Sandbox policy + enforcement
// ---------------------------------------------------------------------------

export interface SandboxPolicy {
  /** Deny network egress (enforced OS-level by the infra runner; declared here). */
  readonly allowEgress: boolean;
  /** Allow secret-bearing env vars through (default false — stripped/rejected). */
  readonly allowSecrets: boolean;
  /** Exact command basenames permitted to run. Anything else is rejected fail-closed. */
  readonly binaryAllowlist: readonly string[];
  /** Wall-clock limit handed to the runner. */
  readonly timeoutMs: number;
  /** Optional resource limits passed to the infra runner (cgroups/ulimits). */
  readonly ulimits?: Readonly<Record<string, number>>;
}

/** Default: deny egress + secrets, allow only the validated enforcer binaries. */
export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  allowEgress: false,
  allowSecrets: false,
  binaryAllowlist: ['dependency-cruiser', 'depcruise', 'deptrac', 'import-linter', 'grimp', 'conftest', 'dotnet'],
  timeoutMs: 120_000,
  ulimits: { cpu: 60, nofile: 1024 },
};

/** Env keys that look like secrets — rejected/stripped unless `allowSecrets`. */
const SECRET_ENV = /(TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE_KEY|API[_-]?KEY|ACCESS[_-]?KEY|AWS_|GITHUB_TOKEN|NPM_TOKEN)/i;

/** basename of a command path (posix or win separators). */
function basename(command: string): string {
  return command.replace(/\\/g, '/').split('/').pop() ?? command;
}

export interface SandboxDecision {
  readonly allowed: boolean;
  readonly violations: readonly string[];
}

/**
 * Validate a {@link ProcessSpec} against a {@link SandboxPolicy} WITHOUT running it.
 * Fail-closed: an unknown binary, a secret-bearing env (when disallowed), or a request
 * to keep egress open all reject.
 */
export function enforceSandboxPolicy(spec: ProcessSpec, policy: SandboxPolicy = DEFAULT_SANDBOX_POLICY): SandboxDecision {
  const violations: string[] = [];
  const bin = basename(spec.command);
  if (!policy.binaryAllowlist.includes(bin)) {
    violations.push(`binary '${bin}' is not in the allowlist`);
  }
  if (!policy.allowSecrets && spec.env) {
    for (const key of Object.keys(spec.env)) {
      if (SECRET_ENV.test(key)) violations.push(`env '${key}' looks like a secret and secrets are denied`);
    }
  }
  return { allowed: violations.length === 0, violations };
}

/** Drop secret-looking env keys from a spec (defense in depth when secrets are denied). */
function sanitizeEnv(spec: ProcessSpec, policy: SandboxPolicy): ProcessSpec {
  if (policy.allowSecrets || !spec.env) return spec;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(spec.env)) if (!SECRET_ENV.test(k)) clean[k] = v;
  return { ...spec, env: clean };
}

/**
 * An {@link IProcessRunner} that enforces a {@link SandboxPolicy} before delegating to
 * an inner runner. This is the seam GT-514 referred to as "hardened by GT-512": the
 * policy layer decides WHAT may run; the inner (infra) runner provides the OS-level
 * egress/cgroup enforcement. Rejected specs never reach the inner runner.
 */
export class SandboxedProcessRunner implements IProcessRunner {
  constructor(
    private readonly inner: IProcessRunner,
    private readonly policy: SandboxPolicy = DEFAULT_SANDBOX_POLICY,
  ) {}

  async run(spec: ProcessSpec): Promise<ProcessResult> {
    const decision = enforceSandboxPolicy(spec, this.policy);
    if (!decision.allowed) {
      throw new Error(`Sandbox policy denied '${spec.command}': ${decision.violations.join('; ')}`);
    }
    const timedSpec: ProcessSpec = {
      ...sanitizeEnv(spec, this.policy),
      timeoutMs: spec.timeoutMs ?? this.policy.timeoutMs,
    };
    return this.inner.run(timedSpec);
  }
}

// ---------------------------------------------------------------------------
// PA-05 Toolchain resolution from the evolith.yaml manifest
// ---------------------------------------------------------------------------

interface ToolchainManifest {
  readonly toolchain?: { readonly runtime?: string };
  readonly runtime?: string;
}

const RUNTIMES: readonly EnforcerRuntime[] = ['node', 'dotnet', 'php', 'python', 'iac', 'shell'];

/**
 * Resolve the evaluation runtime from an `evolith.yaml`-shaped manifest (PA-05).
 * Returns `undefined` when the manifest declares no (or an unknown) runtime — the
 * caller then skips restore rather than guessing.
 */
export function resolveRuntimeFromManifest(manifest: ToolchainManifest | undefined): EnforcerRuntime | undefined {
  const declared = manifest?.toolchain?.runtime ?? manifest?.runtime;
  return declared && (RUNTIMES as readonly string[]).includes(declared) ? (declared as EnforcerRuntime) : undefined;
}
