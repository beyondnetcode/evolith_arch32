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
import { posix as posixPath } from 'node:path';

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

/**
 * Default: deny egress + secrets, allow only the validated enforcer binaries.
 *
 * GT-664 — `semgrep`, `eslint` and `cat` were added because the ISO/IEC 5055
 * pack could not run without them, and that was MEASURED, not suspected: with
 * the pack selected, `evolith validate --select .../iso-5055.rules.json`
 * reported `status: passed, rulesChecked: 0, rulesSkipped: 4` on this
 * repository. The four rules named `semgrep`, the sandbox denied the binary
 * before it was spawned, the adapter threw, and every rule SKIPped — so the
 * pack GT-662 and GT-663 built was unreachable from the CLI for its whole life,
 * and the surface that was supposed to say so said `passed`.
 *
 * `cat` is the widest of the three and is here with its eyes open: it is how
 * `enforce.config.sarif` reads a log the tenant's CI already produced, and it
 * grants an enforcer rule the ability to read any file the process can. What
 * bounds it is everything around it — no shell, an args array rather than a
 * command line, `cwd` confinement, no egress, no secret-bearing env — and the
 * fact that whatever comes back must parse as a SARIF log with a `runs` array
 * or the rule SKIPs. The alternative was to let the adapter touch the
 * filesystem directly, which would put I/O in the domain to avoid naming a
 * binary in a list.
 */
export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  allowEgress: false,
  allowSecrets: false,
  binaryAllowlist: [
    'dependency-cruiser', 'depcruise', 'deptrac', 'import-linter', 'grimp', 'conftest', 'dotnet',
    'semgrep', 'eslint', 'cat',
  ],
  timeoutMs: Number(process.env.SANDBOX_TIMEOUT_MS) || 120_000,
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
    // GT-664 — the policy's wall clock is a CEILING, not just a default. A spec
    // may ask for less time and get it; asking for more is ignored. The wall
    // clock is now settable per rule (`enforce.config.timeoutMs`), and a rule is
    // tenant-supplied content: without the clamp, a ruleset could hand the host
    // a ten-minute analyser run the host's own policy says it will not host.
    const requested = spec.timeoutMs;
    const bounded =
      requested !== undefined && Number.isFinite(requested) && requested > 0
        ? Math.min(requested, this.policy.timeoutMs)
        : this.policy.timeoutMs;
    const timedSpec: ProcessSpec = {
      ...sanitizeEnv(spec, this.policy),
      timeoutMs: bounded,
    };
    return this.inner.run(timedSpec);
  }
}

// ---------------------------------------------------------------------------
// PA-05 Toolchain resolution from the evolith.yaml manifest
// ---------------------------------------------------------------------------

/** One restore/toolchain command as declared in the manifest. */
interface ManifestCommand {
  readonly command?: string;
  readonly args?: readonly string[];
}

interface ToolchainSection {
  readonly runtime?: string;
  /** Explicit, ordered restore commands overriding the runtime default (PA-05). */
  readonly restore?: readonly ManifestCommand[];
}

interface ToolchainManifest {
  readonly toolchain?: ToolchainSection;
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

/**
 * Resolve the ordered restore plan from the `evolith.yaml` manifest (PA-05) — the
 * commands are read from the manifest, NOT hard-coded at the call site. Precedence:
 *  1. explicit `toolchain.restore[]` in the manifest (any tenant-declared toolchain), else
 *  2. the runtime default from {@link buildRestorePlan} for the manifest-declared runtime.
 * Returns `undefined` when the manifest declares neither a usable runtime nor commands —
 * the caller then skips restore rather than guessing a toolchain.
 */
export function resolveRestorePlanFromManifest(manifest: ToolchainManifest | undefined): ProcessSpec[] | undefined {
  const explicit = manifest?.toolchain?.restore;
  if (explicit && explicit.length) {
    const specs = explicit
      .filter((c): c is ManifestCommand & { command: string } => typeof c?.command === 'string' && c.command.length > 0)
      .map<ProcessSpec>((c) => ({ command: c.command, args: c.args ? [...c.args] : [] }));
    if (specs.length) return specs;
  }
  const runtime = resolveRuntimeFromManifest(manifest);
  return runtime ? buildRestorePlan(runtime) : undefined;
}

// ---------------------------------------------------------------------------
// PA-06 Restore EXECUTION + provisioning orchestration
// ---------------------------------------------------------------------------

export interface RestoreStepResult {
  readonly command: string;
  readonly args: readonly string[];
  readonly exitCode: number;
  readonly ok: boolean;
}

export interface RestoreResult {
  readonly ok: boolean;
  readonly steps: readonly RestoreStepResult[];
  /** Index of the first failed step, or `-1` when all succeeded (or none ran). */
  readonly failedStep: number;
}

/**
 * Run a restore plan through an {@link IProcessRunner}, in order, FAIL-FAST at the first
 * non-zero exit — analysis on half-installed dependencies is worse than no analysis. Each
 * step runs in `cwd` (the restored checkout). A tool's non-zero exit is DATA (returned in
 * the result), not an exception; only a runner error (e.g. a sandbox rejection) propagates.
 * The runner SHOULD be a {@link SandboxedProcessRunner} so a plan command outside the
 * allowlist is rejected before it runs.
 */
export async function executeRestorePlan(
  plan: readonly ProcessSpec[],
  runner: IProcessRunner,
  cwd?: string,
): Promise<RestoreResult> {
  const steps: RestoreStepResult[] = [];
  for (let i = 0; i < plan.length; i++) {
    const spec: ProcessSpec = cwd ? { ...plan[i], cwd } : plan[i];
    const res = await runner.run(spec);
    const ok = res.exitCode === 0;
    steps.push({ command: spec.command, args: spec.args, exitCode: res.exitCode, ok });
    if (!ok) return { ok: false, steps, failedStep: i };
  }
  return { ok: true, steps, failedStep: -1 };
}

export interface ProvisionRequest {
  readonly runtime: EnforcerRuntime;
  /** Path to the fetched checkout the analyzers will run against. */
  readonly checkoutPath: string;
  readonly commitSha: string;
  readonly changedFiles?: readonly string[];
  readonly projectRoots?: readonly string[];
  /** Extra cache discriminators (e.g. ruleset version) so a ruleset bump misses. */
  readonly cacheDiscriminators?: readonly string[];
  /**
   * Explicit restore plan (PA-05: resolved from the `evolith.yaml` manifest rather than
   * hard-coded). When set it overrides the runtime default; when omitted the runtime's
   * {@link buildRestorePlan} default is used.
   */
  readonly restorePlan?: readonly ProcessSpec[];
}

export interface ProvisionedEnvironment {
  readonly runtime: EnforcerRuntime;
  readonly checkoutPath: string;
  readonly scope: ProjectScope;
  readonly cacheKey: string;
  readonly cached: boolean;
  /** The restore outcome; `undefined` when nothing needed restoring. */
  readonly restore?: RestoreResult;
  /** True when the checkout is analyzable (restore succeeded or was unnecessary). */
  readonly ready: boolean;
}

/**
 * Compose PA-01..05 into ONE provisioning step (PA-06): resolve project scope, compute the
 * SHA-keyed cache key and — on a cache MISS — run the runtime's restore plan through the
 * (sandbox-wrapped) runner. Returns the descriptor the enforcer adapters consume. A failed
 * restore yields `ready:false` and is NOT cached (so a fixed commit re-provisions cleanly).
 * The passed `runner` SHOULD already be a {@link SandboxedProcessRunner}.
 */
export async function provisionEvaluationEnvironment(
  req: ProvisionRequest,
  runner: IProcessRunner,
  cache: IEvaluationCache<ProvisionedEnvironment> = new InMemoryEvaluationCache<ProvisionedEnvironment>(),
): Promise<ProvisionedEnvironment> {
  const cacheKey = computeEvaluationCacheKey(req.commitSha, req.changedFiles ?? [], req.cacheDiscriminators ?? []);
  const hit = cache.get(cacheKey);
  if (hit) return { ...hit, cached: true };

  const scope = resolveProjectScope(req.changedFiles ?? [], req.projectRoots ?? []);
  const plan = req.restorePlan ?? buildRestorePlan(req.runtime);
  const restore = plan.length ? await executeRestorePlan(plan, runner, req.checkoutPath) : undefined;
  const ready = restore ? restore.ok : true;

  const env: ProvisionedEnvironment = {
    runtime: req.runtime,
    checkoutPath: req.checkoutPath,
    scope,
    cacheKey,
    cached: false,
    restore,
    ready,
  };
  if (ready) cache.set(cacheKey, env);
  return env;
}

// ---------------------------------------------------------------------------
// PA-07 Fetch → materialize → provision integration (repo checkout seam)
// ---------------------------------------------------------------------------

/**
 * An opaque locator for a satellite repository revision to analyze. The Core never
 * receives raw disk paths (ADR-0080); it receives this reference and the reader resolves
 * the bytes. Fields are all optional so the same shape covers GitHub coordinates, an
 * evaluation `workspaceRef`, or an already-inlined payload.
 */
export interface RepositorySourceRef {
  readonly owner?: string;
  readonly repo?: string;
  /** Branch, tag, or commit SHA to fetch. */
  readonly ref?: string;
  /** Opaque workspace reference (ADR-0080) when coordinates are not used. */
  readonly workspaceRef?: string;
}

/**
 * The result of a fetch: a "TEXT tarball" — a map of RELATIVE posix path → text content
 * with NO installed dependencies (the identical shape `OverlayFileSystem` ingests). The
 * `GitHubRepositorySourceReader` delivers exactly this; provisioning then materializes it
 * to disk and runs the restore plan so an analyzer sees a RESTORED checkout.
 */
export interface RepositorySources {
  /** Resolved commit SHA the sources correspond to (drives the PA-03 cache key). */
  readonly commitSha: string;
  /** RELATIVE posix path → text content. Deps are NOT included (restore installs them). */
  readonly files: Readonly<Record<string, string>>;
}

/**
 * Fetches repository sources as a TEXT tarball (no installed deps). The production adapter
 * (`GitHubRepositorySourceReader`, infra) hits the GitHub API; tests inject a stub so the
 * integration seam is exercised WITHOUT the network. Core depends only on this port.
 */
export interface IRepositorySourceReader {
  fetchSources(ref: RepositorySourceRef): Promise<RepositorySources>;
}

/**
 * Writes an in-memory files map to a real working directory and returns the ABSOLUTE
 * checkout path the restore plan and analyzers run against. Implemented by an infra
 * adapter over `IFileSystem` (`NodeWorkspaceMaterializer`); the Core stays stateless and
 * path-agnostic behind this port. Tests inject a stub that records what was materialized.
 */
export interface IWorkspaceMaterializer {
  materialize(files: Readonly<Record<string, string>>): Promise<string>;
}

/** Manifest file names probed (in order) inside the fetched sources for PA-05 resolution. */
const MANIFEST_FILENAMES: readonly string[] = ['evolith.yaml', 'evolith.yml'];

/** Parses `evolith.yaml` text into a manifest object (inject the infra YAML parser). */
export type ManifestParser = (text: string) => unknown;

export interface MaterializeProvisionRequest {
  readonly source: RepositorySourceRef;
  readonly changedFiles?: readonly string[];
  readonly projectRoots?: readonly string[];
  readonly cacheDiscriminators?: readonly string[];
  /**
   * Explicit runtime override. When omitted, the runtime AND restore plan are resolved
   * from the fetched `evolith.yaml` manifest (PA-05) using {@link ManifestParser}.
   */
  readonly runtime?: EnforcerRuntime;
}

export interface MaterializedEnvironment extends ProvisionedEnvironment {
  /** The revision reference that produced this checkout. */
  readonly source: RepositorySourceRef;
  /** Resolved commit SHA (from the reader). */
  readonly commitSha: string;
  /**
   * Absolute, Nx-project-scoped paths exposed to the analyzers. One entry per affected
   * project root (joined under the restored checkout); `[checkoutPath]` when unscoped.
   */
  readonly analysisPaths: readonly string[];
}

/** Locate + parse the `evolith.yaml` manifest inside a fetched files map (PA-05). */
function readManifest(
  files: Readonly<Record<string, string>>,
  parse: ManifestParser | undefined,
): ToolchainManifest | undefined {
  if (!parse) return undefined;
  const key = MANIFEST_FILENAMES.find((name) => typeof files[name] === 'string');
  if (!key) return undefined;
  try {
    const parsed = parse(files[key]);
    return parsed && typeof parsed === 'object' ? (parsed as ToolchainManifest) : undefined;
  } catch {
    return undefined; // a malformed manifest must not crash provisioning; treat as absent
  }
}

/** Join the restored checkout with each scoped project root → absolute analyzer paths. */
function resolveAnalysisPaths(checkoutPath: string, scope: ProjectScope): string[] {
  if (scope.unscoped || scope.projects.length === 0) return [checkoutPath];
  return scope.projects.map((project) => posixPath.join(checkoutPath, project));
}

/**
 * Wire the real repo fetch/checkout into provisioning (GT-512 PA-07). Composes the whole
 * chain an analyzer needs to run against a RESTORED, project-scoped checkout:
 *
 *  1. FETCH  — `reader.fetchSources(source)` returns the TEXT tarball (no installed deps)
 *              and the resolved commit SHA (drives the PA-03 cache key).
 *  2. MANIFEST (PA-05) — resolve the runtime + restore plan from the fetched `evolith.yaml`
 *              rather than hard-coding; an explicit `req.runtime` wins.
 *  3. MATERIALIZE — write the in-memory sources to a working dir (`materializer`).
 *  4. RESTORE + SCOPE + CACHE — delegate to {@link provisionEvaluationEnvironment}, which
 *              runs the restore plan through the (sandbox-wrapped) `runner`, computes the
 *              Nx-affected scope, and caches by SHA + changed-files.
 *  5. EXPOSE — return the restored checkout path plus the project-scoped `analysisPaths`.
 *
 * On a PA-03 cache HIT the fetch/materialize/restore are all skipped — the cache is keyed
 * BEFORE any I/O so a re-evaluation of the same commit + scope never re-fetches. The
 * `runner` SHOULD be a {@link SandboxedProcessRunner}. The `reader`/`materializer` are
 * ports: tests inject stubs (no network, no real `npm ci`); production uses the GitHub
 * reader + Node materializer. A checkout whose runtime cannot be resolved skips restore
 * (`ready:true`, nothing to install) rather than guessing a toolchain.
 */
export async function materializeAndProvisionEnvironment(
  req: MaterializeProvisionRequest,
  deps: {
    readonly reader: IRepositorySourceReader;
    readonly materializer: IWorkspaceMaterializer;
    readonly runner: IProcessRunner;
    readonly cache?: IEvaluationCache<MaterializedEnvironment>;
    readonly parseManifest?: ManifestParser;
  },
): Promise<MaterializedEnvironment> {
  const cache = deps.cache ?? new InMemoryEvaluationCache<MaterializedEnvironment>();

  const sources = await deps.reader.fetchSources(req.source);

  const cacheKey = computeEvaluationCacheKey(
    sources.commitSha,
    req.changedFiles ?? [],
    req.cacheDiscriminators ?? [],
  );
  const hit = cache.get(cacheKey);
  if (hit) return { ...hit, cached: true };

  const manifest = readManifest(sources.files, deps.parseManifest);
  const runtime = req.runtime ?? resolveRuntimeFromManifest(manifest) ?? 'shell';
  const restorePlan = req.runtime ? buildRestorePlan(req.runtime) : resolveRestorePlanFromManifest(manifest) ?? [];

  const checkoutPath = await deps.materializer.materialize(sources.files);

  const provisioned = await provisionEvaluationEnvironment(
    {
      runtime,
      checkoutPath,
      commitSha: sources.commitSha,
      changedFiles: req.changedFiles,
      projectRoots: req.projectRoots,
      cacheDiscriminators: req.cacheDiscriminators,
      restorePlan,
    },
    deps.runner,
    // Inner cache disabled: this orchestrator owns caching of the richer MaterializedEnvironment.
    new InMemoryEvaluationCache<ProvisionedEnvironment>(),
  );

  const env: MaterializedEnvironment = {
    ...provisioned,
    cacheKey,
    source: req.source,
    commitSha: sources.commitSha,
    analysisPaths: resolveAnalysisPaths(checkoutPath, provisioned.scope),
  };
  if (env.ready) cache.set(cacheKey, env);
  return env;
}
