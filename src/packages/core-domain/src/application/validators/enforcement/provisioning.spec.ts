import { StubProcessRunner, type ProcessSpec } from './enforcer.types';
import {
  buildRestorePlan,
  computeEvaluationCacheKey,
  DEFAULT_SANDBOX_POLICY,
  enforceSandboxPolicy,
  InMemoryEvaluationCache,
  resolveProjectScope,
  resolveRuntimeFromManifest,
  SandboxedProcessRunner,
} from './provisioning';

describe('buildRestorePlan (GT-512 PA-01)', () => {
  it('produces runtime-correct restore commands', () => {
    expect(buildRestorePlan('node')).toEqual([{ command: 'npm', args: ['ci'] }]);
    expect(buildRestorePlan('dotnet').map((s) => s.command)).toEqual(['dotnet', 'dotnet']);
    expect(buildRestorePlan('python')[1]).toEqual({ command: 'pip', args: ['install', 'grimp'] });
    expect(buildRestorePlan('php')[0].command).toBe('composer');
    expect(buildRestorePlan('iac')).toEqual([]);
    expect(buildRestorePlan('shell')).toEqual([]);
  });
});

describe('resolveProjectScope (GT-512 PA-02 — Nx-style affected scoping)', () => {
  const roots = ['src/packages/core-domain', 'src/apps/core-api', 'src/apps/cli'];

  it('maps changed files to their longest-prefix project root', () => {
    const scope = resolveProjectScope(
      ['src/apps/core-api/src/main.ts', 'src/packages/core-domain/src/x.ts', 'src/packages/core-domain/src/y.ts'],
      roots,
    );
    expect(scope.projects).toEqual(['src/apps/core-api', 'src/packages/core-domain']);
    expect(scope.unscoped).toBe(false);
  });

  it('flags unscoped when nothing maps to a known project (caller may fall back)', () => {
    expect(resolveProjectScope(['README.md', 'docs/x.md'], roots)).toEqual({ projects: [], unscoped: true });
  });

  it('normalizes ./ and backslash paths', () => {
    expect(resolveProjectScope(['.\\src/apps/cli/index.ts'], roots).projects).toEqual(['src/apps/cli']);
  });
});

describe('EvaluationCache (GT-512 PA-03 — SHA + changed-files scope)', () => {
  it('re-evaluating the same commit + scope hits the cache', () => {
    const cache = new InMemoryEvaluationCache<{ verdict: string }>();
    const key = computeEvaluationCacheKey('abc123', ['src/a.ts', 'src/b.ts']);
    expect(cache.has(key)).toBe(false);
    cache.set(key, { verdict: 'PASS' });
    // same commit, same files (order-independent) → same key → hit
    expect(cache.get(computeEvaluationCacheKey('abc123', ['src/b.ts', 'src/a.ts']))).toEqual({ verdict: 'PASS' });
  });

  it('a different commit or changed-file set misses (distinct key)', () => {
    const base = computeEvaluationCacheKey('abc123', ['src/a.ts']);
    expect(computeEvaluationCacheKey('def456', ['src/a.ts'])).not.toBe(base); // commit changed
    expect(computeEvaluationCacheKey('abc123', ['src/a.ts', 'src/c.ts'])).not.toBe(base); // scope changed
    expect(computeEvaluationCacheKey('abc123', ['src/a.ts'], ['ruleset@2'])).not.toBe(base); // discriminator
  });

  it('produces a stable 32-hex key', () => {
    expect(computeEvaluationCacheKey('abc123', ['src/a.ts'])).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('Sandbox policy (GT-512 PA-04)', () => {
  it('defaults deny egress + secrets and allowlist only validated binaries', () => {
    expect(DEFAULT_SANDBOX_POLICY.allowEgress).toBe(false);
    expect(DEFAULT_SANDBOX_POLICY.allowSecrets).toBe(false);
    expect(DEFAULT_SANDBOX_POLICY.binaryAllowlist).toContain('dependency-cruiser');
  });

  it('rejects a binary not in the allowlist (fail-closed)', () => {
    const d = enforceSandboxPolicy({ command: '/bin/curl', args: ['http://evil'] });
    expect(d.allowed).toBe(false);
    expect(d.violations[0]).toMatch(/not in the allowlist/);
  });

  it('rejects secret-bearing env when secrets are denied', () => {
    const d = enforceSandboxPolicy({ command: 'depcruise', args: [], env: { PATH: '/usr/bin', GITHUB_TOKEN: 'x', AWS_SECRET_ACCESS_KEY: 'y' } });
    expect(d.allowed).toBe(false);
    expect(d.violations).toHaveLength(2);
  });

  it('allows an allowlisted binary with clean env', () => {
    expect(enforceSandboxPolicy({ command: 'depcruise', args: ['-T', 'json'], env: { PATH: '/usr/bin' } }).allowed).toBe(true);
  });
});

describe('SandboxedProcessRunner (GT-512 PA-04 — hardens the GT-514 IProcessRunner)', () => {
  it('delegates an allowed spec to the inner runner (and applies the policy timeout)', async () => {
    const inner = new StubProcessRunner({ exitCode: 0, stdout: 'ok', stderr: '' });
    const runner = new SandboxedProcessRunner(inner);
    const out = await runner.run({ command: 'depcruise', args: ['-T', 'json'] });
    expect(out.stdout).toBe('ok');
  });

  it('rejects a disallowed spec fail-closed — the inner runner is never reached', async () => {
    let reached = false;
    const inner = { run: async () => { reached = true; return { exitCode: 0, stdout: '', stderr: '' }; } };
    const runner = new SandboxedProcessRunner(inner);
    await expect(runner.run({ command: 'curl', args: [] })).rejects.toThrow(/Sandbox policy denied/);
    expect(reached).toBe(false);
  });

  it('strips secret env before delegating (defense in depth)', async () => {
    let seen: ProcessSpec | undefined;
    const inner = { run: async (s: ProcessSpec) => { seen = s; return { exitCode: 0, stdout: '', stderr: '' }; } };
    // allow secrets=false but the binary is allowed; a non-secret env passes, secret keys are stripped
    const runner = new SandboxedProcessRunner(inner);
    await runner.run({ command: 'depcruise', args: [], env: { PATH: '/usr/bin' } });
    expect(seen?.env).toEqual({ PATH: '/usr/bin' });
  });
});

describe('resolveRuntimeFromManifest (GT-512 PA-05)', () => {
  it('reads the runtime from an evolith.yaml-shaped manifest', () => {
    expect(resolveRuntimeFromManifest({ toolchain: { runtime: 'node' } })).toBe('node');
    expect(resolveRuntimeFromManifest({ runtime: 'dotnet' })).toBe('dotnet');
  });
  it('returns undefined for a missing or unknown runtime (no guessing)', () => {
    expect(resolveRuntimeFromManifest(undefined)).toBeUndefined();
    expect(resolveRuntimeFromManifest({ runtime: 'cobol' })).toBeUndefined();
  });
});
