import { Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { AbacEvaluator } from './abac-evaluator';
import { MetricsService } from './metrics.service';
import { ToolDispatchService } from './mcp-tool-dispatch';
import { ToolRegistryService } from './tool-registry.service';
import { McpTool } from './tool.interface';
import { ErrorCodes } from '../common/errors';
import {
  readHeadSha,
  resolveWorkspaceDir,
  shaMatches,
  verifyBaseSha,
  WORKSPACE_DIR_ARG_KEYS,
} from './workspace-concurrency';

/**
 * GT-606 — ADR-0093 §1 Optimistic State Verification, exercised as a real race.
 *
 * The load-bearing test here is the first one. It does NOT hand the tool a
 * fabricated wrong SHA: it stands up a real git repository, has the client read
 * a real HEAD, then lets a SECOND mutative call — in flight at the same time —
 * land a real `git commit` in the window between that read and the dispatch's
 * verification. Every SHA in its assertions came out of `git rev-parse`. The
 * deliberately-stale-SHA case below is a cheaper second case, not the proof.
 *
 * The race also asserts the write did not happen: the second tool's side-effect
 * file must not exist afterwards. A conflict envelope with the mutation applied
 * anyway would be worse than no check at all.
 */

/** ABAC has its own suites; here it must simply not be the subject. */
class PermissiveAbac extends AbacEvaluator {
  override evaluateNative() {
    return { allowed: true, violations: [] };
  }
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}
function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function tool(name: string, execute: McpTool['execute'], mutative = true): McpTool {
  return {
    schema: { name, description: 'd', inputSchema: { type: 'object', properties: {} } },
    mutative,
    scope: mutative ? ('write' as const) : ('read' as const),
    execute,
  };
}

function git(repo: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf-8' }).trim();
}

function dispatchFor(tools: McpTool[], headShaReader = readHeadSha): ToolDispatchService {
  return new ToolDispatchService(
    new ToolRegistryService(tools),
    new MetricsService(),
    new PermissiveAbac(),
    new Logger('gt606'),
    trace.getTracer('gt606'),
    headShaReader,
  );
}

/** The ADR-0073 envelope carried by a dispatch result. */
function envelopeOf(result: { structuredContent?: Record<string, unknown> }): any {
  return result.structuredContent;
}

const APPROVAL = { apply: true, approvalToken: 'gt606-approval' };

describe('GT-606 / ADR-0093 §1 — optimistic concurrency on mutative MCP tools', () => {
  const tempDirs: string[] = [];

  afterAll(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });

  function newTempDir(prefix = 'gt606-'): string {
    const dir = mkdtempSync(path.join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  function newRepo(): string {
    const repo = newTempDir();
    git(repo, 'init', '--quiet', '--initial-branch=main');
    git(repo, 'config', 'user.email', 'gt606@evolith.test');
    git(repo, 'config', 'user.name', 'GT-606');
    git(repo, 'config', 'commit.gpgsign', 'false');
    writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
    git(repo, 'add', '.');
    git(repo, 'commit', '--quiet', '-m', 'initial');
    return repo;
  }

  it('rejects with CONCURRENCY_CONFLICT when HEAD really moves mid-flight (genuine race)', async () => {
    const repo = newRepo();
    const victimFile = path.join(repo, 'agent-b-wrote-this.txt');

    // The client reads the real HEAD it plans against. Nothing is fabricated.
    const shaA = await readHeadSha(repo);
    expect(shaA).toMatch(/^[0-9a-f]{40}$/);

    const bReachedVerification = deferred();
    const aCommitted = deferred<string>();

    // Agent A's tool: advances HEAD with a REAL commit, but only once agent B's
    // call is already inside the dispatch — so the two are genuinely concurrent.
    const advanceHead = tool('evolith-test-advance-head', async () => {
      await bReachedVerification.promise;
      git(repo, 'commit', '--quiet', '--allow-empty', '-m', 'agent A landed first');
      const shaB = git(repo, 'rev-parse', 'HEAD');
      aCommitted.resolve(shaB);
      return { committed: shaB };
    });

    // Agent B's tool: the lost update we are trying to prevent. If the guard
    // fails, this file exists at the end of the test.
    let bExecuted = false;
    const writeFile = tool('evolith-test-write', async () => {
      bExecuted = true;
      writeFileSync(victimFile, 'agent B overwrote agent A\n');
      return { written: victimFile };
    });

    const serviceA = dispatchFor([advanceHead, writeFile]);
    // Agent B's dispatch reads HEAD through the REAL reader, but parks at the
    // verification point long enough for agent A's commit to land. This is the
    // interleaving of the ADR's sequence diagram, made deterministic.
    const serviceB = dispatchFor([advanceHead, writeFile], async (dir) => {
      bReachedVerification.resolve();
      await aCommitted.promise;
      return readHeadSha(dir);
    });

    const pB = serviceB.callTool('evolith-test-write', { path: repo, baseSha: shaA, ...APPROVAL });
    const pA = serviceA.callTool('evolith-test-advance-head', { path: repo, ...APPROVAL });

    const [resB, resA] = await Promise.all([pB, pA]);
    const shaB = await aCommitted.promise;

    // Agent A won the race and its commit is real.
    expect(envelopeOf(resA).success).toBe(true);
    expect(shaB).toMatch(/^[0-9a-f]{40}$/);
    expect(shaB).not.toBe(shaA);
    expect(git(repo, 'rev-parse', 'HEAD')).toBe(shaB);

    // Agent B is rejected, with the ADR-0073 envelope and the ADR-0093 code.
    const env = envelopeOf(resB);
    expect(resB.isError).toBe(true);
    expect(env.success).toBe(false);
    expect(env.error.code).toBe(ErrorCodes.CONCURRENCY_CONFLICT);
    expect(env.error.code).toBe('CONCURRENCY_CONFLICT');
    expect(env.error.details).toMatchObject({
      conflict_type: 'git_sha_mismatch',
      expected_sha: shaA,
      actual_sha: shaB,
      workspace: repo,
    });
    // ADR-0073 shape: { success, error, meta } — never a bare throw, never `data`.
    expect(env.meta).toMatchObject({ command: 'evolith-test-write', tool: 'evolith-test-write' });
    expect(typeof env.meta.correlationId).toBe('string');
    expect(typeof env.meta.durationMs).toBe('number');
    expect(env.meta.schemaVersion).toBe('1.0.0');
    expect(env.data).toBeUndefined();

    // The whole point: the write never happened.
    expect(bExecuted).toBe(false);
    expect(existsSync(victimFile)).toBe(false);
  });

  it('rejects a deliberately stale baseSha (second, weaker case)', async () => {
    const repo = newRepo();
    let executed = false;
    const service = dispatchFor([
      tool('evolith-test-write', async () => {
        executed = true;
        return {};
      }),
    ]);

    const res = await service.callTool('evolith-test-write', {
      path: repo,
      baseSha: '0000000000000000000000000000000000000000',
      ...APPROVAL,
    });

    const env = envelopeOf(res);
    expect(env.success).toBe(false);
    expect(env.error.code).toBe('CONCURRENCY_CONFLICT');
    expect(env.error.details.conflict_type).toBe('git_sha_mismatch');
    expect(env.error.details.actual_sha).toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(executed).toBe(false);
  });

  it('lets the call through when baseSha matches HEAD (the guard is not a blanket deny)', async () => {
    const repo = newRepo();
    let executed = false;
    const service = dispatchFor([
      tool('evolith-test-write', async () => {
        executed = true;
        return { ok: true };
      }),
    ]);

    const res = await service.callTool('evolith-test-write', {
      path: repo,
      baseSha: await readHeadSha(repo),
      ...APPROVAL,
    });

    expect(envelopeOf(res).success).toBe(true);
    expect(executed).toBe(true);
  });

  it('accepts an abbreviated baseSha, as ADR-0093 §3 itself illustrates', async () => {
    const repo = newRepo();
    const service = dispatchFor([tool('evolith-test-write', async () => ({ ok: true }))]);

    const res = await service.callTool('evolith-test-write', {
      path: repo,
      baseSha: git(repo, 'rev-parse', '--short=12', 'HEAD'),
      ...APPROVAL,
    });

    expect(envelopeOf(res).success).toBe(true);
  });

  it('fails closed when baseSha is supplied but HEAD cannot be resolved', async () => {
    const notARepo = newTempDir('gt606-bare-');
    let executed = false;
    const service = dispatchFor([
      tool('evolith-test-write', async () => {
        executed = true;
        return {};
      }),
    ]);

    const res = await service.callTool('evolith-test-write', {
      path: notARepo,
      baseSha: 'f12f060ebb72',
      ...APPROVAL,
    });

    const env = envelopeOf(res);
    expect(env.success).toBe(false);
    expect(env.error.code).toBe('CONCURRENCY_CONFLICT');
    expect(env.error.details.conflict_type).toBe('head_unresolved');
    expect(executed).toBe(false);
  });

  it('leaves read-only tools untouched (no baseSha semantics on reads)', async () => {
    const repo = newRepo();
    const service = dispatchFor([tool('evolith-test-read', async () => ({ ok: true }), false)]);

    const res = await service.callTool('evolith-test-read', {
      path: repo,
      baseSha: '0000000000000000000000000000000000000000',
    });

    expect(envelopeOf(res).success).toBe(true);
  });

  describe('strict mode (EVOLITH_MCP_REQUIRE_BASE_SHA)', () => {
    const previous = process.env.EVOLITH_MCP_REQUIRE_BASE_SHA;
    afterEach(() => {
      if (previous === undefined) delete process.env.EVOLITH_MCP_REQUIRE_BASE_SHA;
      else process.env.EVOLITH_MCP_REQUIRE_BASE_SHA = previous;
    });

    it('rejects a mutative call that omits baseSha entirely', async () => {
      process.env.EVOLITH_MCP_REQUIRE_BASE_SHA = '1';
      const repo = newRepo();
      let executed = false;
      const service = dispatchFor([
        tool('evolith-test-write', async () => {
          executed = true;
          return {};
        }),
      ]);

      const res = await service.callTool('evolith-test-write', { path: repo, ...APPROVAL });

      const env = envelopeOf(res);
      expect(env.success).toBe(false);
      expect(env.error.code).toBe('CONCURRENCY_CONFLICT');
      expect(env.error.details.conflict_type).toBe('missing_base_sha');
      expect(executed).toBe(false);
    });

    it('permits an omitted baseSha by default (opt-in If-Match semantics)', async () => {
      delete process.env.EVOLITH_MCP_REQUIRE_BASE_SHA;
      const repo = newRepo();
      const service = dispatchFor([tool('evolith-test-write', async () => ({ ok: true }))]);
      const res = await service.callTool('evolith-test-write', { path: repo, ...APPROVAL });
      expect(envelopeOf(res).success).toBe(true);
    });
  });

  describe('workspace resolution', () => {
    it('honours every documented directory argument, in precedence order', () => {
      expect([...WORKSPACE_DIR_ARG_KEYS]).toEqual(['satellitePath', 'path', 'dir', 'output']);
      expect(resolveWorkspaceDir({ satellitePath: '/s', path: '/p', dir: '/d' })).toBe('/s');
      expect(resolveWorkspaceDir({ path: '/p', dir: '/d', output: '/o' })).toBe('/p');
      expect(resolveWorkspaceDir({ dir: '/d', output: '/o' })).toBe('/d');
      expect(resolveWorkspaceDir({ output: '/o' })).toBe('/o');
      expect(resolveWorkspaceDir({}, '/fallback')).toBe('/fallback');
      expect(resolveWorkspaceDir({ path: '   ' }, '/fallback')).toBe('/fallback');
    });
  });

  describe('sha comparison', () => {
    const full = 'f12f060ebb72a3f9256612df0102030405060708';
    it('matches a full sha or a 7+ char abbreviation, and nothing shorter', () => {
      expect(shaMatches(full, full)).toBe(true);
      expect(shaMatches(full.toUpperCase(), full)).toBe(true);
      expect(shaMatches('f12f060', full)).toBe(true);
      expect(shaMatches('f12f06', full)).toBe(false);
      expect(shaMatches('a3f9256', full)).toBe(false);
    });
  });

  describe('verifyBaseSha in isolation', () => {
    it('is a no-op when no baseSha is supplied and strict mode is off', async () => {
      const readHead = jest.fn();
      await expect(verifyBaseSha({ args: {}, readHead })).resolves.toBeNull();
      expect(readHead).not.toHaveBeenCalled();
    });
  });
});
