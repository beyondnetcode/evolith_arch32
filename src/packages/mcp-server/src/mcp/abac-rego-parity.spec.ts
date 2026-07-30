import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
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
 * by the last describe block, which never skips: it COMPILES the bundle itself when
 * it is missing or stale, and fails when it cannot. See that block's header.
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
 * The compiled artifact itself — GT-602 acceptance criteria 1 and 3.
 *
 * ## Why this block does not skip, under any condition
 *
 * `policy.wasm` is a gitignored build output. The previous shape of this block
 * ran only when `EVOLITH_REQUIRE_OPA_WASM=1` and `it.skip`ped otherwise, which
 * meant the ONLY artifact that decides at runtime was verified in exactly one CI
 * job and in no developer checkout. That is the same shape that let GT-632
 * happen: a stale `policy.wasm` sat at the pre-`src/` path on one machine, the
 * checks that could have noticed were inert everywhere else, and every MCP tool
 * was denied in production while the suite was green.
 *
 * So the decision here is: **the test compiles the policy itself.** If the
 * bundle is missing, or older than any `.rego` it is built from, this block runs
 * `.harness/scripts/compile-opa-wasm.mjs` — the exact script `npm run
 * build:policy` runs, writing the exact paths the runtime loads — and if that
 * compilation cannot happen the block FAILS with the compiler's own diagnostic.
 * There is no environment in which it passes without having evaluated a wasm.
 *
 * Two consequences worth stating rather than discovering:
 *   - the block needs the pinned `opa` binary (cached under `.harness/bin`,
 *     downloaded on first use). No binary and no network is a RED test, not a
 *     skipped one. A check nobody can satisfy is a problem to fix in the
 *     environment, not to paper over with a skip;
 *   - it rebuilds on STALENESS, not just absence, because a stale bundle is the
 *     failure this gap is about. `compile-opa-wasm.mjs` installs by rename, so a
 *     sibling jest worker reading `policy.wasm` never observes a partial file.
 */
describe('GT-602 — the compiled policy.wasm allows an architect in production', () => {
  const WASM_PATH = path.join(REPO_ROOT, 'src', 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm');
  const REGO_DIR = path.join(REPO_ROOT, 'src', 'rulesets', 'opa');
  const COMPILER = path.join(REPO_ROOT, '.harness', 'scripts', 'compile-opa-wasm.mjs');

  /**
   * DENOMINATOR FLOORS. An assertion over an empty list passes, and "no tool was
   * denied" over zero tools is the disease this whole backlog is about. Both
   * counts were measured on 2026-07-29 (50 registered tools, 50 explicitly
   * classified names). They are floors, not fixtures: adding tools keeps them
   * true, and REMOVING a tool has to be a deliberate edit here — which is the
   * point, because a registry that silently collapses to nothing is precisely
   * how this suite would go quiet while still reporting green.
   */
  const MIN_REGISTERED_TOOLS = 50;
  const MIN_CLASSIFIED_TOOLS = 50;

  const ARCHITECT_IN_PRODUCTION = {
    user: { id: 'arch-1', roles: ['architect'], tenant: 'evolith' },
    resource_domain: 'mcp-server',
    environment: 'production',
  } as const;

  /** Newest mtime across the rego sources the bundle is compiled from. */
  function newestRegoMtimeMs(): number {
    const regoFiles = fs
      .readdirSync(REGO_DIR)
      .filter((f) => f.endsWith('.rego'))
      .map((f) => path.join(REGO_DIR, f));
    if (regoFiles.length === 0) {
      throw new Error(`No .rego sources under ${REGO_DIR} — the policy corpus moved.`);
    }
    return Math.max(...regoFiles.map((f) => fs.statSync(f).mtimeMs));
  }

  /**
   * Guarantee a compiled bundle that is NOT older than its sources. Missing or
   * stale → compile. Compilation failing → throw, so `beforeAll` reports the
   * compiler's stderr instead of the suite quietly verifying nothing.
   */
  function ensureFreshPolicy(): void {
    const regoMtime = newestRegoMtimeMs();
    const fresh = fs.existsSync(WASM_PATH) && fs.statSync(WASM_PATH).mtimeMs >= regoMtime;
    if (fresh) return;

    const why = fs.existsSync(WASM_PATH) ? 'STALE (older than the rego sources)' : 'MISSING';
    const res = spawnSync(process.execPath, [COMPILER], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 300_000,
    });
    if (res.status !== 0 || !fs.existsSync(WASM_PATH)) {
      throw new Error(
        `The compiled ABAC policy is ${why} and could not be built.\n` +
          `  compiler: node ${path.relative(REPO_ROOT, COMPILER)} (exit ${res.status})\n` +
          `  expected: ${WASM_PATH}\n` +
          `  ${String(res.stderr || res.stdout || '(no output)').trim().split('\n').slice(-8).join('\n  ')}\n` +
          'This test never skips: the artifact that authorizes every MCP tool call in ' +
          'production must be evaluated, and an unverifiable policy is a failure, not an absence.',
      );
    }
  }

  let policy: any;
  let registered: string[];

  beforeAll(async () => {
    ensureFreshPolicy();
    // @ts-ignore: opa-wasm ships no type declarations (same as abac-evaluator.ts)
    const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
    policy = await loadPolicy(fs.readFileSync(WASM_PATH));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    registered = moduleRef.get(ToolRegistryService).listSchemas().map((s) => s.name);
  }, 300_000);

  /** Evaluate the COMPILED bundle (not the rego source) for one tool name. */
  function violationsFor(name: string): Array<{ id: string }> {
    const resultSet = policy.evaluate({ ...ARCHITECT_IN_PRODUCTION, tool_name: name }, 'evolith/abac/violations');
    return Array.isArray(resultSet?.[0]?.result) ? resultSet[0].result : [];
  }

  it('evaluated a real bundle, not a missing one, and not one older than its sources', () => {
    expect(fs.existsSync(WASM_PATH)).toBe(true);
    expect(fs.statSync(WASM_PATH).size).toBeGreaterThan(0);
    // GT-632 in one line: the artifact that decides must post-date the rules it encodes.
    expect(fs.statSync(WASM_PATH).mtimeMs).toBeGreaterThanOrEqual(newestRegoMtimeMs());
    expect(policy).toBeDefined();
  });

  /**
   * Negative control, asserted FIRST because everything below it depends on it.
   * If `policy.evaluate` ever returned an unexpected shape, `violationsFor` would
   * yield `[]` for every name and every ALLOW assertion in this block would pass
   * vacuously. A name in no rego set must come back `ABAC-03` (unknown tool) —
   * which is also exactly what a registry tool missing from the policy produces.
   */
  it('flags a tool absent from the compiled policy as ABAC-03', () => {
    const ids = violationsFor('evolith-not-a-real-tool').map((v) => v.id);
    expect(ids).toContain('ABAC-03');
  });

  it('returns zero violations for every classified tool', () => {
    const classified = AbacEvaluator.classifiedToolNames();
    // Denominator before verdict.
    expect(classified.length).toBeGreaterThanOrEqual(MIN_CLASSIFIED_TOOLS);

    const evaluated = classified.map((name) => ({ name, violations: violationsFor(name) }));
    expect(evaluated).toHaveLength(classified.length);

    const denied = evaluated
      .filter((row) => row.violations.length > 0)
      .map((row) => `${row.name} -> ${row.violations.map((v) => v.id).join('+')}`);
    expect(denied).toEqual([]);
  });

  /**
   * Acceptance criterion 1, against the artifact rather than the source: every
   * tool the DI graph actually REGISTERS is evaluated through the compiled bundle
   * and must ALLOW an `architect` in `production`. A tool added to the TypeScript
   * registry and never propagated into the policy arrives here as `ABAC-03`.
   *
   * This is also acceptance criterion 3 — the CI failure on a registry/policy
   * divergence — because `.github/workflows/ci-cd.yml` (job `Test mcp-server`, a
   * required check on `main`) runs this suite.
   */
  it('allows an architect in production for EVERY registered tool name', () => {
    // Denominator, three ways: the registry is non-trivial, every name in it was
    // actually evaluated, and every evaluation came back allowed. "No denials"
    // over an empty registry would otherwise be indistinguishable from success.
    expect(registered.length).toBeGreaterThanOrEqual(MIN_REGISTERED_TOOLS);

    const evaluated = registered.map((name) => ({ name, violations: violationsFor(name) }));
    expect(evaluated).toHaveLength(registered.length);

    const denied = evaluated
      .filter((row) => row.violations.length > 0)
      .map((row) => `${row.name} -> ${row.violations.map((v) => v.id).join('+')}`);
    // Before the rego fix this listed the fifteen tools of GT-602 as `ABAC-03+ABAC-01`.
    expect(denied).toEqual([]);

    const allowed = evaluated.filter((row) => row.violations.length === 0);
    expect(allowed).toHaveLength(registered.length);
  });

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
  it(
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
