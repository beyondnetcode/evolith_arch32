import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { trace } from '@opentelemetry/api';
import { AppModule } from '../app.module';
import { ToolRegistryService } from './tool-registry.service';
import { AbacEvaluator, ToolClass } from './abac-evaluator';
import { ToolDispatchService } from './mcp-tool-dispatch';
import { MetricsService } from './metrics.service';
import { McpTool } from './tool.interface';
import { mcpContextStorage } from './mcp-user-context';
import { createLocalSessionContext } from './mcp-auth-contexts';

/**
 * GT-602 — guard the OPA twin of the native ABAC classification.
 *
 * `mcp-tool-dispatch.ts` requires BOTH engines to allow (`native AND opa`), so a
 * tool that TypeScript classifies and the rego does not is FORBIDDEN in
 * production, silently and totally. That is precisely what happened: fifteen
 * tools — the ADR catalog, the pattern catalog, the scaffolding family,
 * `evolith-upgrade-plan/apply` and `evolith-fixtures` — were registered in
 * `TOOL_CLASSIFICATION` and never added to `abac-mcp-tool-access.rego`, so the
 * compiled bundle answered `ABAC-03` (unknown tool) + `ABAC-01` for an
 * `architect` in `production`.
 *
 * `abac-classification-coverage.spec.ts` guards registry ↔ TypeScript. This file
 * guards TypeScript ↔ rego, in BOTH directions, and it reads the **tracked rego
 * source** rather than the gitignored `policy.wasm`, so it runs unconditionally
 * in every environment (the compiled bundle is only built by the jobs that need
 * it, and a check that silently self-skips is not a check).
 *
 * The compiled bundle is additionally verified when it happens to be present —
 * see the last describe block.
 */

/** Walk up from this file until the repository root (the one holding `src/rulesets`). */
function findRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'src', 'rulesets', 'opa', 'abac-mcp-tool-access.rego'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not locate the repository root from ' + __dirname);
}

const REPO_ROOT = findRepoRoot();
const REGO_PATH = path.join(REPO_ROOT, 'src', 'rulesets', 'opa', 'abac-mcp-tool-access.rego');

/** Extract `<name> := { "a", "b" }` as a set of the quoted string literals. */
function parseRegoSet(source: string, setName: string): Set<string> {
  const start = source.indexOf(`${setName} := {`);
  if (start < 0) throw new Error(`Rego set '${setName}' not found in ${REGO_PATH}`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  if (close < 0) throw new Error(`Rego set '${setName}' is not terminated in ${REGO_PATH}`);
  const body = source.slice(open + 1, close);
  // Drop `#` comments before harvesting literals so a commented-out name cannot
  // be mistaken for a member.
  const uncommented = body
    .split('\n')
    .map((line) => line.replace(/#.*$/, ''))
    .join('\n');
  return new Set([...uncommented.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

const REGO_SOURCE = fs.readFileSync(REGO_PATH, 'utf8');
const REGO_SETS: Record<ToolClass, Set<string>> = {
  read: parseRegoSet(REGO_SOURCE, 'read_tools'),
  write: parseRegoSet(REGO_SOURCE, 'write_tools'),
  deploy: parseRegoSet(REGO_SOURCE, 'deploy_tools'),
};

/** The rego class a name belongs to, or `undefined` when it is in no set (→ ABAC-03). */
function regoClassOf(name: string): ToolClass | undefined {
  return (Object.keys(REGO_SETS) as ToolClass[]).find((cls) => REGO_SETS[cls].has(name));
}

describe('GT-602 — dual-engine ABAC parity (TypeScript ↔ rego)', () => {
  const abac = new AbacEvaluator();

  it('parses the three rego tool sets (guard against a silently empty parse)', () => {
    expect(REGO_SETS.read.size).toBeGreaterThan(20);
    expect(REGO_SETS.write.size).toBeGreaterThan(10);
    expect(REGO_SETS.deploy.size).toBeGreaterThan(0);
  });

  it('classifies every explicitly classified tool identically in both engines', () => {
    const divergences = AbacEvaluator.classifiedToolNames()
      .map((name) => ({ name, ts: abac.classifyTool(name), rego: regoClassOf(name) }))
      .filter((row) => row.ts !== row.rego);

    // Before the fix this listed the 15 tools of GT-602 with `rego: undefined`.
    expect(divergences).toEqual([]);
  });

  it('classifies every rego-listed tool identically in TypeScript (no OPA-only grant)', () => {
    const divergences = (Object.keys(REGO_SETS) as ToolClass[])
      .flatMap((cls) => [...REGO_SETS[cls]].map((name) => ({ name, rego: cls, ts: abac.classifyTool(name) })))
      .filter((row) => row.ts !== row.rego);

    expect(divergences).toEqual([]);
  });

  it('leaves an unknown tool unclassified in both engines (ABAC-03 still means something)', () => {
    expect(abac.classifyTool('evolith-not-a-real-tool')).toBeUndefined();
    expect(regoClassOf('evolith-not-a-real-tool')).toBeUndefined();
  });
});

describe('GT-602 — every REGISTERED tool exists in the compiled policy source', () => {
  const abac = new AbacEvaluator();
  let registeredNames: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registeredNames = moduleRef.get(ToolRegistryService).listSchemas().map((s) => s.name);
  });

  it('has a rego classification for every tool the DI graph registers', () => {
    expect(registeredNames.length).toBeGreaterThan(0);
    const missingFromRego = registeredNames.filter((name) => regoClassOf(name) === undefined);
    expect(missingFromRego).toEqual([]);
  });

  it('would allow an architect in production to reach every registered tool', () => {
    // The native half of `native AND opa`, evaluated over the real surface with
    // the exact identity of the GT-602 reproduction.
    const denied = registeredNames.filter(
      (name) =>
        !abac.evaluateNative({
          user: { id: 'arch-1', roles: ['architect'], tenant: 'evolith' },
          tool_name: name,
          resource_domain: 'mcp-server',
          environment: 'production',
        }).allowed,
    );
    expect(denied).toEqual([]);
  });
});

/**
 * The compiled artifact itself. `policy.wasm` is a gitignored build output that
 * only the jobs running `npm run build:policy` produce, so this block asserts
 * against it when it exists and refuses to pass silently when the caller has
 * declared it must (`EVOLITH_REQUIRE_OPA_WASM=1`).
 */
describe('GT-602 — the compiled policy.wasm allows an architect in production', () => {
  const WASM_PATH = path.join(REPO_ROOT, 'src', 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm');
  const wasmPresent = fs.existsSync(WASM_PATH);
  const required = process.env.EVOLITH_REQUIRE_OPA_WASM === '1';

  it('is present when the caller declared it required', () => {
    if (!required) return expect(true).toBe(true);
    expect(wasmPresent).toBe(true);
  });

  (wasmPresent ? it : it.skip)(
    'returns zero violations for every classified tool',
    async () => {
      // @ts-ignore: opa-wasm ships no type declarations (same as abac-evaluator.ts)
      const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
      const policy = await loadPolicy(fs.readFileSync(WASM_PATH));

      const denied: string[] = [];
      for (const name of AbacEvaluator.classifiedToolNames()) {
        const resultSet = policy.evaluate(
          {
            user: { id: 'arch-1', roles: ['architect'], tenant: 'evolith' },
            tool_name: name,
            resource_domain: 'mcp-server',
            environment: 'production',
          },
          'evolith/abac/violations',
        );
        const violations = Array.isArray(resultSet?.[0]?.result) ? resultSet[0].result : [];
        if (violations.length > 0) {
          denied.push(`${name} -> ${violations.map((v: { id: string }) => v.id).join('+')}`);
        }
      }
      expect(denied).toEqual([]);
    },
    30_000,
  );

  /**
   * GT-602 × GT-572 — the two engines together, through real dispatch.
   *
   * `mcp-tool-dispatch` requires `native AND opa`, so neither engine alone proves
   * anything. This drives the actual `ToolDispatchService` with the REAL
   * `AbacEvaluator` (loading the compiled bundle from disk, no stub) under
   * `NODE_ENV=production`, as the stdio `local-session` principal — the exact
   * configuration a containerised MCP server runs in — and asserts a verdict
   * rather than a FORBIDDEN envelope for a tool that GT-602 had denied.
   */
  (wasmPresent ? it : it.skip)(
    'serves evolith-adr-list to the production stdio principal end to end',
    async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const adrList: McpTool = {
          schema: { name: 'evolith-adr-list', description: 'd', inputSchema: { type: 'object', properties: {} } },
          scope: 'read',
          execute: async () => ({ adrs: ['ADR-0087'] }),
        };
        const dispatch = new ToolDispatchService(
          new ToolRegistryService([adrList]),
          new MetricsService(),
          new AbacEvaluator(),
          new Logger('gt-602'),
          trace.getTracer('gt-602'),
        );

        const result = await mcpContextStorage.run(createLocalSessionContext(), () =>
          dispatch.callTool('evolith-adr-list', {}),
        );

        // Before the rego fix this was `{ isError: true, FORBIDDEN, ABAC-03 }`.
        expect(result.isError).toBeFalsy();
        const envelope = JSON.parse(result.content[0].text);
        expect(envelope.success).toBe(true);
        expect(envelope.data.adrs).toEqual(['ADR-0087']);
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
    },
    30_000,
  );
});
