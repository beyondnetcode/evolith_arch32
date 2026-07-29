/**
 * GT-632 — proof that HXA-01, HXA-02, HXA-04 and HXA-05 now EXECUTE, and can FAIL.
 *
 * Nothing here is mocked in the load-bearing places:
 *  - the rules are read from the real `adr-0002-hexagonal-architecture.rules.json`,
 *    with their `enforce` block carried verbatim the way `DiskRulesetRepository`
 *    now carries it;
 *  - the workspaces are real directories with real files on disk, walked by the
 *    real `IFileSystem` surface and parsed by the real TypeScript AST;
 *  - the verdicts come from the real `NativeEvaluator`, so this also asserts the
 *    handler is REGISTERED, not merely importable.
 *
 * The suite is built so that every assertion can fail:
 *  - a dirty workspace must produce `failed` (an all-passing engine fails here);
 *  - a clean workspace must produce `passed` (an always-failing engine fails here);
 *  - stripping `enforce` must send the rules back to `skipped` (a handler that
 *    claimed by rule id, or by category alone, would fail here) — that last one is
 *    the control that keeps the other two honest, because it is the exact defect
 *    state this change removes.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import * as fsp from 'fs/promises';
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { IFileSystem, ILogger } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { NativeEvaluator } from '../../native-evaluator';
import { ModuleBoundaryRuleHandler } from '../module-boundary-rule.handler';
import { createCompositeEnforcerStrategy } from '../../../enforcement/enforcer-subsystem';
import { StubProcessRunner } from '../../../enforcement/enforcer.types';

// ---------------------------------------------------------------------------
// The real rules, from the real ruleset file
// ---------------------------------------------------------------------------

function findRuleset(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json');
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error('adr-0002-hexagonal-architecture.rules.json not found');
}

const RULESET = JSON.parse(readFileSync(findRuleset(), 'utf8')) as {
  rules: Array<Record<string, unknown>>;
};

/** Normalize exactly as DiskRulesetRepository does, `enforce` included. */
function normalized(id: string): NormalizedRule {
  const raw = RULESET.rules.find(r => r['id'] === id);
  if (!raw) throw new Error(`${id} is not in the ADR-0002 ruleset`);
  return {
    id,
    severity: String(raw['severity']) as NormalizedRule['severity'],
    category: String(raw['category']),
    title: String(raw['title']),
    description: String(raw['description']),
    blocking: Boolean(raw['blocking']),
    validationQuery: raw['validationQuery'] ? String(raw['validationQuery']) : undefined,
    enforce: raw['enforce'] as NormalizedRule['enforce'],
    sourceFile: 'src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json',
  };
}

const BOUNDARY_RULE_IDS = ['HXA-01', 'HXA-02', 'HXA-04', 'HXA-05'] as const;
const RULES = BOUNDARY_RULE_IDS.map(normalized);

// ---------------------------------------------------------------------------
// A real filesystem, over real temp directories
// ---------------------------------------------------------------------------

const realFs = {
  readFile: (p: string) => fsp.readFile(p, 'utf8'),
  exists: async (p: string) => { try { await fsp.stat(p); return true; } catch { return false; } },
  readdirNames: (p: string) => fsp.readdir(p),
  stat: async (p: string) => {
    const s = await fsp.stat(p);
    return { isDirectory: () => s.isDirectory(), isFile: () => s.isFile() };
  },
} as unknown as IFileSystem;

const silentLogger = {
  info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined,
} as ILogger;

function materialize(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'gt632-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return root;
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

/** Every file here violates exactly one of the four boundaries. */
const DIRTY_WORKSPACE: Record<string, string> = {
  // HXA-01: a Core file importing a framework package.
  // HXA-04: the same Core file reaching forward into Infrastructure.
  'src/domain/order.entity.ts': [
    `import { InjectRepository } from '@nestjs/typeorm';`,
    `import { db } from '../infrastructure/db';`,
    `export class Order { constructor(readonly id: string) {} }`,
    `export const wired = [InjectRepository, db];`,
  ].join('\n'),

  // HXA-02: Application reaching into Infrastructure.
  'src/application/create-order.use-case.ts': [
    `import { OrderRepository } from '../infrastructure/order.repository';`,
    `import { Order } from '../domain/order.entity';`,
    `export class CreateOrder { constructor(private readonly repo: OrderRepository) {} }`,
    `export type Made = Order;`,
  ].join('\n'),

  // HXA-05: an AOP/observability SDK inside the Application layer.
  'src/application/audit.use-case.ts': [
    `import { trace } from '@opentelemetry/api';`,
    `export const span = () => trace.getTracer('audit');`,
  ].join('\n'),

  'src/infrastructure/db.ts': `export const db = { query: () => undefined };`,
  'src/infrastructure/order.repository.ts': `export class OrderRepository {}`,
};

/** The same shape, obeying every boundary. */
const CLEAN_WORKSPACE: Record<string, string> = {
  'src/domain/order.entity.ts': [
    `import { Money } from './money.vo';`,
    `export class Order { constructor(readonly total: Money) {} }`,
  ].join('\n'),
  'src/domain/money.vo.ts': `export class Money { constructor(readonly amount: number) {} }`,
  'src/application/create-order.use-case.ts': [
    `import { Order } from '../domain/order.entity';`,
    `export class CreateOrder { make(o: Order) { return o; } }`,
  ].join('\n'),
  'src/application/audit.use-case.ts': [
    `import type { Order } from '../domain/order.entity';`,
    `export const audit = (o: Order) => o;`,
  ].join('\n'),
  'src/infrastructure/order.repository.ts': [
    `import { CreateOrder } from '../application/create-order.use-case';`,
    `import { InjectRepository } from '@nestjs/typeorm';`,
    `export class OrderRepository { constructor(readonly uc: CreateOrder) {} }`,
    `export const wired = InjectRepository;`,
  ].join('\n'),
};

// ---------------------------------------------------------------------------

describe('GT-632 · the four blocking HXA rules that reported `skipped`', () => {
  let dirty: string;
  let clean: string;

  beforeAll(() => {
    dirty = materialize(DIRTY_WORKSPACE);
    clean = materialize(CLEAN_WORKSPACE);
  });

  afterAll(() => {
    rmSync(dirty, { recursive: true, force: true });
    rmSync(clean, { recursive: true, force: true });
  });

  const evaluate = (root: string) =>
    new NativeEvaluator(realFs, silentLogger, {} as never).evaluateAll(
      RULES.map(r => ({ ...r })),
      { satellitePath: root, corePath: root },
    );

  it('carries a complete from/to clause on all four (the input this depends on)', () => {
    for (const rule of RULES) {
      expect(rule.blocking).toBe(true);
      expect(rule.enforce?.engine).toBe('enforcer');
      expect((rule.enforce?.config as Record<string, Record<string, string>>)?.from?.path).toBeTruthy();
      expect((rule.enforce?.config as Record<string, Record<string, string>>)?.to?.path).toBeTruthy();
    }
  });

  it('the NativeEvaluator now CLAIMS all four (before: no handler, verdict `skipped`)', async () => {
    const results = await evaluate(clean);
    expect(results.map(r => r.result)).not.toContain('skipped');
    expect(results.map(r => r.result)).not.toContain('errored');
  });

  it('FAILS on a workspace that genuinely violates each boundary', async () => {
    const results = await evaluate(dirty);
    const byId = new Map(results.map(r => [r.rule.id, r]));

    // HXA-01 — Core imports a framework package.
    expect(byId.get('HXA-01')).toMatchObject({ result: 'failed' });
    expect(byId.get('HXA-01')!.message).toContain('src/domain/order.entity.ts');
    expect(byId.get('HXA-01')!.message).toContain('@nestjs/typeorm');

    // HXA-02 — Application imports Infrastructure.
    expect(byId.get('HXA-02')).toMatchObject({ result: 'failed' });
    expect(byId.get('HXA-02')!.message).toContain('src/application/create-order.use-case.ts');
    expect(byId.get('HXA-02')!.message).toContain('../infrastructure/order.repository');

    // HXA-04 — dependency direction reversed: Core → Infrastructure.
    expect(byId.get('HXA-04')).toMatchObject({ result: 'failed' });
    expect(byId.get('HXA-04')!.message).toContain('src/domain/order.entity.ts');

    // HXA-05 — an observability SDK inside the Application layer.
    expect(byId.get('HXA-05')).toMatchObject({ result: 'failed' });
    expect(byId.get('HXA-05')!.message).toContain('@opentelemetry/api');
  });

  it('PASSES on a clean workspace — the same rules, the opposite verdict', async () => {
    const results = await evaluate(clean);
    for (const r of results) {
      expect(r).toMatchObject({ rule: { id: r.rule.id }, result: 'passed' });
    }
    // The clean fixture is not clean by being empty: Infrastructure DOES import
    // `@nestjs/typeorm` and the Application layer, which is legal and must not be
    // flagged. A handler that matched on the import alone, ignoring `from`, would
    // fail this assertion.
    expect(results).toHaveLength(4);
  });

  it('goes straight back to `skipped` when the enforce clause is removed (the control)', async () => {
    // The negative control: this is the pre-GT-632 state reproduced on demand. If
    // the handler ever starts claiming these rules by id or by category alone,
    // this test — and only this test — catches it.
    const stripped = RULES.map(({ enforce: _enforce, ...rest }) => rest as NormalizedRule);
    const results = await new NativeEvaluator(realFs, silentLogger, {} as never).evaluateAll(
      stripped,
      { satellitePath: dirty, corePath: dirty },
    );
    expect(results.map(r => r.result)).toEqual(['skipped', 'skipped', 'skipped', 'skipped']);
  });
});

describe('GT-632 · the PRODUCTION strategy, end to end', () => {
  // All three surfaces inject a real `NodeProcessRunner`, so the live strategy is
  // `CompositeRuleEvaluator`, not `NativeEvaluator` — and the composite routes
  // these four rules to dependency-cruiser FIRST, because they say
  // `engine: 'enforcer'`. This asserts the whole live path, including the
  // degradation, rather than only the handler the previous suite exercises.
  let dirty: string;

  beforeAll(() => { dirty = materialize(DIRTY_WORKSPACE); });
  afterAll(() => { rmSync(dirty, { recursive: true, force: true }); });

  it('fails the four rules even though dependency-cruiser is not installed', async () => {
    const strategy = createCompositeEnforcerStrategy(
      new NativeEvaluator(realFs, silentLogger, {} as never),
      // An empty binary allowlist stands in for "the tool is not there", which is
      // the state of every satellite today: `dependency-cruiser` is in no
      // package.json in this repository.
      new StubProcessRunner(),
      { policy: { allowEgress: false, allowSecrets: false, binaryAllowlist: [], timeoutMs: 1000 } },
    );

    const results = await strategy.evaluateAll(RULES.map(r => ({ ...r })), { satellitePath: dirty, corePath: dirty });

    expect(results.map(r => r.result)).toEqual(['failed', 'failed', 'failed', 'failed']);
    for (const r of results) {
      // The report says the analyzer did not run AND still delivers a verdict.
      expect(r.message).toContain('enforcer unavailable');
    }
  });
});

describe('GT-632 · ModuleBoundaryRuleHandler claims by clause, not by id', () => {
  const handler = new ModuleBoundaryRuleHandler(realFs);
  const base: NormalizedRule = {
    id: 'X-01', severity: 'MUST', category: 'layer-structure', title: 't',
    description: 'd', blocking: true, sourceFile: 's',
  };

  it('claims a never-before-seen rule that carries a from/to clause', () => {
    expect(handler.canHandle({
      ...base,
      id: 'BRAND-NEW-99',
      enforce: { engine: 'enforcer', tool: 'dependency-cruiser', config: { from: { path: '^src/a/' }, to: { path: '^src/b/' } } },
    })).toBe(true);
  });

  it('does NOT claim a boundary-category rule with no lowerable clause (HXA-06)', () => {
    // HXA-06 is enforcer-routed but supplies no config; claiming it would turn
    // honest handler backlog into an unattributed skip.
    expect(handler.canHandle(normalized('HXA-06'))).toBe(false);
  });

  it('does NOT claim HXA-07, whose clause is only half of what the rule asserts', () => {
    // It carries a valid from/to clause AND a timing budget. Passing it on the
    // import half alone would be exactly the false pass this work removes.
    const hxa07 = normalized('HXA-07');
    expect((hxa07.enforce?.config as Record<string, unknown>)?.['from']).toBeTruthy();
    expect(handler.canHandle(hxa07)).toBe(false);
  });

  it('does NOT claim a rule whose clause uses a construct the native engine lacks', () => {
    expect(handler.canHandle({
      ...base,
      enforce: { engine: 'enforcer', tool: 'dependency-cruiser', config: { from: { path: '^src/' }, to: { circular: true } } },
    })).toBe(false);
  });
});
