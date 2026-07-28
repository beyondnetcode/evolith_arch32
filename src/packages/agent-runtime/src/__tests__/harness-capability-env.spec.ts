/**
 * GT-607 (AC2/AC3) — a spawned `.harness` capability cannot read the Core token.
 *
 * The adapter used to spawn with `...process.env`, so every capability script —
 * including one a tenant could contribute — inherited `AGENT_RUNTIME_CORE_TOKEN`,
 * the Tracker token and `EVOLITH_RAG_PG_URL`. This suite REALLY spawns a probe
 * capability that prints its own environment and asserts the credentials are not
 * in it. Revert `buildCapabilityEnv` back to `...process.env` and the first two
 * tests below go red.
 */

import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HarnessProcessAdapter } from '../adapters/harness/harness-process.adapter';
import { OpaCliPolicyValidationAdapter } from '../adapters/policy/opa-cli-policy-validation.adapter';
import {
  buildCapabilityEnv,
  isCredentialEnvName,
  DEFAULT_CAPABILITY_ENV_ALLOWLIST,
} from '../adapters/harness/capability-env';

/** Sentinels planted in the parent process; a leak is unambiguous. */
const SECRETS: Record<string, string> = {
  AGENT_RUNTIME_CORE_TOKEN: 'gt607-core-token-must-not-leak',
  EVOLITH_TRACKER_TOKEN: 'gt607-tracker-token-must-not-leak',
  EVOLITH_RAG_PG_URL: 'postgres://gt607-user:gt607-pass@localhost:5432/rag',
  EVOLITH_LLM_API_KEY: 'gt607-llm-api-key-must-not-leak',
  GITHUB_TOKEN: 'gt607-github-token-must-not-leak',
};

const PROBE = `
// Prints its own environment so the test can inspect exactly what it received.
process.stdout.write(JSON.stringify(process.env));
`;

describe('GT-607 — spawned capabilities get an allowlisted environment', () => {
  let workspace: string;
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    workspace = mkdtempSync(join(tmpdir(), 'gt607-harness-'));
    mkdirSync(join(workspace, '.harness'), { recursive: true });
    writeFileSync(join(workspace, 'probe.mjs'), PROBE, 'utf8');
    writeFileSync(
      join(workspace, '.harness', 'manifest.yaml'),
      [
        'version: 1',
        'capabilities:',
        '  - name: env-probe',
        '    type: script',
        '    description: prints its environment',
        '    entry: probe.mjs',
        '    runner: node',
        '',
      ].join('\n'),
      'utf8',
    );
    for (const [name, value] of Object.entries(SECRETS)) {
      saved[name] = process.env[name];
      process.env[name] = value;
    }
  });

  afterAll(() => {
    for (const name of Object.keys(SECRETS)) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
    rmSync(workspace, { recursive: true, force: true });
  });

  const runProbe = async (): Promise<Record<string, string>> => {
    const adapter = new HarnessProcessAdapter({ cwd: workspace, timeoutMs: 30_000 });
    const result = await adapter.execute({ capability: 'env-probe' });
    if (!result.ok) throw new Error(`probe capability did not run: ${result.stderr ?? '(no stderr)'}`);
    expect(result.data).toBeDefined();
    return result.data as Record<string, string>;
  };

  it('a spawned capability CANNOT read the Core token, nor any other credential', async () => {
    const childEnv = await runProbe();

    // The names are gone…
    for (const name of Object.keys(SECRETS)) {
      expect(childEnv[name]).toBeUndefined();
    }
    // …and so are the values, under any name the child might have received them.
    const leaked = Object.entries(childEnv).filter(([, value]) =>
      Object.values(SECRETS).some((secret) => value.includes(secret)),
    );
    expect(leaked).toEqual([]);
  });

  it('no credential- or endpoint-shaped NAME survives into the child at all', async () => {
    const childEnv = await runProbe();
    expect(Object.keys(childEnv).filter(isCredentialEnvName)).toEqual([]);
  });

  it('still passes what a capability legitimately needs', async () => {
    const childEnv = await runProbe();
    expect(childEnv.AGENT_RUNTIME_ARGS).toBe('{}');
    expect(childEnv.AGENT_RUNTIME_CONTEXT).toBe('{}');
    expect(childEnv.AGENT_RUNTIME_DRY_RUN).toBe('0');
    expect(childEnv.PATH).toBeTruthy();
  });

  it('reports the names it refused instead of dropping them silently', async () => {
    const denied: string[] = [];
    const adapter = new HarnessProcessAdapter({
      cwd: workspace,
      timeoutMs: 30_000,
      envAllowlist: ['AGENT_RUNTIME_CORE_TOKEN', 'PATH'],
      onEnvDenied: (names) => denied.push(...names),
    });
    const result = await adapter.execute({ capability: 'env-probe' });

    expect(result.ok).toBe(true);
    expect(denied).toContain('AGENT_RUNTIME_CORE_TOKEN');
    expect((result.data as Record<string, string>).AGENT_RUNTIME_CORE_TOKEN).toBeUndefined();
  });
});

describe('GT-607 — the policy binary is a spawned child too', () => {
  const saved = process.env.AGENT_RUNTIME_CORE_TOKEN;

  beforeAll(() => {
    process.env.AGENT_RUNTIME_CORE_TOKEN = 'gt607-core-token-must-not-leak';
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.AGENT_RUNTIME_CORE_TOKEN;
    else process.env.AGENT_RUNTIME_CORE_TOKEN = saved;
  });

  it('the OPA process is launched with an allowlisted environment, never an inherited one', async () => {
    let observed: NodeJS.ProcessEnv | undefined | 'not-passed';
    const fakeSpawn = ((_cmd: string, _args: readonly string[], options: { env?: NodeJS.ProcessEnv }) => {
      observed = 'env' in options ? options.env : 'not-passed';
      const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { write: () => true, end: () => undefined };
      child.kill = () => true;
      setImmediate(() => {
        (child.stdout as EventEmitter).emit(
          'data',
          Buffer.from('{"result":[{"expressions":[{"value":true}]}]}'),
        );
        child.emit('close', 0);
      });
      return child as never;
    }) as unknown as typeof import('node:child_process').spawn;

    const adapter = new OpaCliPolicyValidationAdapter({ spawnImpl: fakeSpawn });
    const result = await adapter.validate({ policyRef: 'evolith.test', input: {} });

    expect(result.allowed).toBe(true);
    // Inheriting (`spawn` with no `env`) is the defect: assert an env was passed…
    expect(observed).not.toBe('not-passed');
    expect(observed).toBeDefined();
    const env = observed as NodeJS.ProcessEnv;
    // …that it is allowlisted, not the parent's…
    expect(env.AGENT_RUNTIME_CORE_TOKEN).toBeUndefined();
    expect(Object.keys(env).filter(isCredentialEnvName)).toEqual([]);
    // …and that it is still usable (the binary must be findable).
    expect(env.PATH).toBeTruthy();
  });
});

describe('GT-607 — buildCapabilityEnv', () => {
  const parentEnv = {
    PATH: '/usr/bin',
    HOME: '/home/agent',
    AGENT_RUNTIME_CORE_TOKEN: 'nope',
    EVOLITH_RAG_PG_URL: 'postgres://nope',
    EVOLITH_FEATURE_FLAG: 'on',
  };

  it('copies only allowlisted names', () => {
    const { env } = buildCapabilityEnv({ parentEnv });
    expect(env.PATH).toBe('/usr/bin');
    expect(env.HOME).toBe('/home/agent');
    expect(env.EVOLITH_FEATURE_FLAG).toBeUndefined();
  });

  it('an operator CANNOT re-admit a credential through the allowlist', () => {
    const { env, denied } = buildCapabilityEnv({
      parentEnv,
      extraAllowlist: ['AGENT_RUNTIME_CORE_TOKEN', 'EVOLITH_RAG_PG_URL', 'EVOLITH_FEATURE_FLAG'],
    });
    expect(env.AGENT_RUNTIME_CORE_TOKEN).toBeUndefined();
    expect(env.EVOLITH_RAG_PG_URL).toBeUndefined();
    expect(env.EVOLITH_FEATURE_FLAG).toBe('on');
    expect(denied.sort()).toEqual(['AGENT_RUNTIME_CORE_TOKEN', 'EVOLITH_RAG_PG_URL']);
  });

  it('refuses a credential-shaped name even when passed explicitly or as payload', () => {
    const { env, denied } = buildCapabilityEnv({
      parentEnv: {},
      explicit: { SOME_API_KEY: 'x' },
      payload: { CALLBACK_URL: 'https://example.test', AGENT_RUNTIME_ARGS: '{}' },
    });
    expect(env).toEqual({ AGENT_RUNTIME_ARGS: '{}' });
    expect(denied.sort()).toEqual(['CALLBACK_URL', 'SOME_API_KEY']);
  });

  it('the default allowlist names no Evolith variable', () => {
    expect(DEFAULT_CAPABILITY_ENV_ALLOWLIST.some((n) => /EVOLITH|AGENT_RUNTIME|TRACKER/i.test(n))).toBe(false);
    expect(DEFAULT_CAPABILITY_ENV_ALLOWLIST.filter(isCredentialEnvName)).toEqual([]);
  });
});
