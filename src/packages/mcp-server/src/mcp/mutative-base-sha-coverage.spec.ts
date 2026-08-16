import { issueGrantForCall } from './approval-grant';

/** GT-679 — mint the approval this call needs, bound to its own arguments. */
function approvedArgs(tool: string, args: Record<string, unknown>): Record<string, unknown> {
  const { token } = issueGrantForCall({
    approver: 'coverage-approver@example.com',
    principal: 'anonymous',
    tenant: 'default',
    tool,
    args,
  });
  return { apply: true, approvalToken: token };
}

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { trace } from '@opentelemetry/api';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { AppModule } from '../app.module';
import { AbacEvaluator } from './abac-evaluator';
import { MetricsService } from './metrics.service';
import { ToolDispatchService } from './mcp-tool-dispatch';
import { ToolRegistryService } from './tool-registry.service';
import { McpTool } from './tool.interface';
import {
  BASE_SHA_ARG,
  NON_WORKSPACE_DIR_ARG_KEYS,
  WORKSPACE_DIR_ARG_KEYS,
} from './workspace-concurrency';

/**
 * GT-606 — the DENOMINATOR guard for ADR-0093.
 *
 * ADR-0093 says "mutative tools", not "these twenty tools". So the protected set
 * is never hand-listed here: it is enumerated off the live DI-registered
 * registry — the same graph the server actually serves — and every member is
 * driven through the real dispatch. A tool added tomorrow with `mutative:true`
 * joins this suite automatically and must pass it; a tool that somehow escaped
 * the central check fails the build with its own name in the diff.
 *
 * The counterpart guard `mutative-hitl-parity.spec.ts` (GT-475) already ensures
 * the `mutative` flag itself cannot drift from the ABAC write/deploy
 * classification, so "every mutative tool" is a trustworthy denominator rather
 * than a flag anyone can quietly omit.
 */

class PermissiveAbac extends AbacEvaluator {
  override evaluateNative() {
    return { allowed: true, violations: [] };
  }
  override async evaluateOpa() {
    return { allowed: true, violations: [] };
  }
}

/** Property names that look like a filesystem location and so could be a write target. */
const DIR_LIKE = /(^|[a-z])(path|dir|directory|root|output|workspace|cwd)$/i;

describe('GT-606 — every mutative tool in the live registry is baseSha-protected', () => {
  let registry: ToolRegistryService;
  let mutativeTools: McpTool[];
  let repo: string;

  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf-8' }).trim();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registry = moduleRef.get(ToolRegistryService, { strict: false });
    mutativeTools = registry.list().filter((t) => t.mutative === true);

    repo = mkdtempSync(path.join(tmpdir(), 'gt606-registry-'));
    execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: repo });
    git('config', 'user.email', 'gt606@evolith.test');
    git('config', 'user.name', 'GT-606');
    git('config', 'commit.gpgsign', 'false');
    writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'initial');
  });

  afterAll(() => {
    if (repo) rmSync(repo, { recursive: true, force: true });
  });

  it('enumerates a non-empty mutative set from the registry (the guard is not vacuous)', () => {
    expect(mutativeTools.length).toBeGreaterThan(0);
    // Printed so the count in the change log is observed, never asserted from
    // memory. Pinning an exact number here would only force a churn edit every
    // time a tool is added, which is the opposite of what this guard is for.
    // eslint-disable-next-line no-console
    console.log(
      `[GT-606] mutative tools: ${mutativeTools.length} of ${registry.list().length} registered\n` +
        mutativeTools.map((t) => `  - ${t.schema.name}`).join('\n'),
    );
  });

  it('advertises baseSha on every mutative tool and on no read-only tool', () => {
    const missing = mutativeTools
      .map((t) => registry.describe(t))
      .filter((s) => (s.inputSchema.properties as Record<string, any>)?.[BASE_SHA_ARG]?.type !== 'string')
      .map((s) => s.name);
    expect(missing).toEqual([]);

    const spurious = registry
      .list()
      .filter((t) => t.mutative !== true)
      .map((t) => registry.describe(t))
      .filter((s) => (s.inputSchema.properties as Record<string, unknown>)?.[BASE_SHA_ARG])
      .map((s) => s.name);
    expect(spurious).toEqual([]);
  });

  it('resolves the write target of every mutative tool (no tool checks the wrong repository)', () => {
    // A mutative tool whose directory argument the resolver does not know would
    // have its baseSha verified against the server cwd instead of the directory
    // it writes into — a false green, which is worse than no check.
    const known = new Set<string>([...WORKSPACE_DIR_ARG_KEYS, ...NON_WORKSPACE_DIR_ARG_KEYS]);
    const unresolvable = mutativeTools.flatMap((tool) =>
      Object.keys(tool.schema.inputSchema.properties ?? {})
        .filter((prop) => DIR_LIKE.test(prop) && !known.has(prop))
        .map((prop) => `${tool.schema.name}.${prop}`),
    );
    expect(unresolvable).toEqual([]);
  });

  it('returns CONCURRENCY_CONFLICT from EVERY mutative tool on a stale baseSha', async () => {
    // The stale SHA is verified before `execute`, so no tool body runs and
    // nothing is provisioned, written or called out to.
    const staleSha = '0'.repeat(40);
    const dispatch = new ToolDispatchService(
      registry,
      new MetricsService(),
      new PermissiveAbac(),
      new Logger('gt606'),
      trace.getTracer('gt606'),
    );

    const verdicts: Array<{ tool: string; code: unknown; conflict: unknown }> = [];
    for (const tool of mutativeTools) {
      const result = await dispatch.callTool(tool.schema.name, {
        path: repo,
        dir: repo,
        satellitePath: repo,
        output: repo,
        baseSha: staleSha,
        // GT-679 — a placeholder string is no longer an approval; the gate now
        // verifies a server-issued grant bound to these very arguments. What this
        // case asserts (baseSha coverage) is unchanged.
        ...approvedArgs(tool.schema.name, {
          path: repo, dir: repo, satellitePath: repo, output: repo, baseSha: staleSha,
        }),
      });
      const env = result.structuredContent as any;
      verdicts.push({
        tool: tool.schema.name,
        code: env?.success === false ? env.error.code : `UNPROTECTED(success=${env?.success})`,
        conflict: env?.error?.details?.conflict_type,
      });
    }

    expect(verdicts).toEqual(
      mutativeTools.map((t) => ({
        tool: t.schema.name,
        code: 'CONCURRENCY_CONFLICT',
        conflict: 'git_sha_mismatch',
      })),
    );
  }, 60_000);
});
