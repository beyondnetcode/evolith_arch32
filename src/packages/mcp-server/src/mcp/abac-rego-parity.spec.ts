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
 * The COMPILED bundle — the artifact that actually decides at runtime — is verified
 * by the last describe block. That block is mandatory wherever
 * `EVOLITH_REQUIRE_OPA_WASM=1` is set (CI), so its absence fails instead of skipping.
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
 * only the jobs running `npm run build:policy` produce.
 *
 * A test that skips where it is ENFORCED verifies nothing, so this block is
 * governed by `EVOLITH_REQUIRE_OPA_WASM`:
 *
 *   - unset (a developer checkout that never compiled the bundle) → the block
 *     skips, and says so;
 *   - `=1` (CI — `.github/workflows/ci-cd.yml`, job `Test mcp-server`, which runs
 *     `npm run build:policy` immediately before the suite) → the block RUNS, and a
 *     missing bundle is a FAILURE, not a skip.
 */
describe('GT-602 — the compiled policy.wasm allows an architect in production', () => {
  const WASM_PATH = path.join(REPO_ROOT, 'src', 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm');
  const wasmPresent = fs.existsSync(WASM_PATH);
  const required = process.env.EVOLITH_REQUIRE_OPA_WASM === '1';
  // When the caller declared the bundle required we run the assertions even if the
  // file is absent, so the failure names the artifact instead of quietly skipping.
  const itCompiled = wasmPresent || required ? it : it.skip;

  const ARCHITECT_IN_PRODUCTION = {
    user: { id: 'arch-1', roles: ['architect'], tenant: 'evolith' },
    resource_domain: 'mcp-server',
    environment: 'production',
  } as const;

  /** Evaluate the COMPILED bundle (not the rego source) for one tool name. */
  function violationsFor(policy: any, name: string): Array<{ id: string }> {
    const resultSet = policy.evaluate({ ...ARCHITECT_IN_PRODUCTION, tool_name: name }, 'evolith/abac/violations');
    return Array.isArray(resultSet?.[0]?.result) ? resultSet[0].result : [];
  }

  async function loadCompiledPolicy(): Promise<any> {
    expect(
      wasmPresent
        ? 'present'
        : `MISSING compiled policy bundle at ${WASM_PATH}. ` +
          `EVOLITH_REQUIRE_OPA_WASM=1 declares it mandatory — run \`npm run build:policy\` before this suite.`,
    ).toBe('present');
    // @ts-ignore: opa-wasm ships no type declarations (same as abac-evaluator.ts)
    const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
    return loadPolicy(fs.readFileSync(WASM_PATH));
  }

  it('is present when the caller declared it required (EVOLITH_REQUIRE_OPA_WASM=1)', () => {
    if (!required) {
      // Not a silent pass: state the condition under which this block is inert.
      expect(required).toBe(false);
      return;
    }
    expect(wasmPresent).toBe(true);
  });

  itCompiled(
    'returns zero violations for every classified tool',
    async () => {
      const policy = await loadCompiledPolicy();
      const denied: string[] = [];
      for (const name of AbacEvaluator.classifiedToolNames()) {
        const violations = violationsFor(policy, name);
        if (violations.length > 0) {
          denied.push(`${name} -> ${violations.map((v) => v.id).join('+')}`);
        }
      }
      expect(denied).toEqual([]);
    },
    60_000,
  );

  /**
   * Acceptance criteria 1 and 3, against the artifact rather than the source: every
   * tool the DI graph actually REGISTERS must be known to the compiled bundle and
   * must ALLOW an `architect` in `production`. A tool added to the TypeScript
   * registry and never added to the rego reaches this as `ABAC-03` (unknown tool).
   */
  itCompiled(
    'allows an architect in production for every REGISTERED tool name',
    async () => {
      const policy = await loadCompiledPolicy();
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const registered = moduleRef.get(ToolRegistryService).listSchemas().map((s) => s.name);

      expect(registered.length).toBeGreaterThan(0);
      const denied = registered
        .map((name) => ({ name, violations: violationsFor(policy, name) }))
        .filter((row) => row.violations.length > 0)
        .map((row) => `${row.name} -> ${row.violations.map((v) => v.id).join('+')}`);

      // Before the rego fix this listed the fifteen tools of GT-602 as `ABAC-03+ABAC-01`.
      expect(denied).toEqual([]);
    },
    60_000,
  );

  /**
   * Negative control for the two assertions above. `policy.evaluate` returning an
   * unexpected shape would make `violationsFor` yield `[]` for everything and both
   * ALLOW assertions would pass vacuously — the exact failure mode this row exists
   * to catch. A name in NO rego set must come back as `ABAC-03` (unknown tool),
   * which is also what a registry tool missing from the policy would produce.
   */
  itCompiled(
    'flags a tool absent from the compiled policy as ABAC-03',
    async () => {
      const policy = await loadCompiledPolicy();
      const ids = violationsFor(policy, 'evolith-not-a-real-tool').map((v) => v.id);
      expect(ids).toContain('ABAC-03');
    },
    60_000,
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
  itCompiled(
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
