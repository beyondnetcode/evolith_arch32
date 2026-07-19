import { Actor } from './authority-policy';
import {
  DeclaredScope,
  ScopeContractError,
  ScopeResolutionError,
  ScopeSpec,
  ScopeViolationError,
  activateScope,
  compareToDeclared,
  declareScope,
  evaluateScope,
  formatScopeContract,
  formatScopeDecision,
  hasWidened,
  isInScope,
  isWithin,
  narrowScope,
  requireResolvedScope,
  requireScope,
  resolveScope,
  widenScope,
} from './scope-contract';

const agent: Actor = { id: 'winston-agent', kind: 'agent' };
const engine: Actor = { id: 'core-engine', kind: 'engine' };
const ci: Actor = { id: 'github-actions', kind: 'ci' };
const person: Actor = { id: 'dev@evolith', kind: 'human' };
const board: Actor = { id: 'architecture-board', kind: 'board' };

const spec = (over: Partial<ScopeSpec> = {}): ScopeSpec => ({
  id: 'opa-parity-gate',
  root: '/repo',
  include: ['src/rulesets'],
  effects: ['read'],
  declaredBy: 'github-actions',
  reason: 'evaluate the OPA fixtures that changed in this PR',
  ...over,
});

const declared = (over: Partial<ScopeSpec> = {}): DeclaredScope => declareScope(spec(over));

// ─── Declaration happens before execution, and is inspectable ───────────────

describe('declaring a scope', () => {
  it('anchors every selector under the root so the contract is inspectable before it runs', () => {
    const scope = declared({ include: ['src/rulesets', '/repo/src/sdk'], exclude: ['src/rulesets/agents'] });
    expect(scope.root).toBe('/repo');
    expect(scope.include).toEqual(['/repo/src/rulesets', '/repo/src/sdk']);
    expect(scope.exclude).toEqual(['/repo/src/rulesets/agents']);
    expect(scope.effects).toEqual(['read']);
  });

  it('refuses an empty include list, because "nothing declared" must not read as "everything"', () => {
    expect(() => declareScope(spec({ include: [] }))).toThrow(ScopeContractError);
    expect(() => declareScope(spec({ include: [] }))).toThrow(/include list is empty/);
  });

  it('refuses a scope that declares no effect', () => {
    expect(() => declareScope(spec({ effects: [] }))).toThrow(/declares no effects/);
  });

  it('refuses a selector that escapes the root, rather than resolving the traversal', () => {
    expect(() => declareScope(spec({ include: ['../other-repo'] }))).toThrow(/escapes root/);
    expect(() => declareScope(spec({ include: ['/elsewhere'] }))).toThrow(/escapes root/);
  });

  it('refuses an exclusion outside the root, because it signals a wrong mental model', () => {
    expect(() => declareScope(spec({ exclude: ['/elsewhere/tmp'] }))).toThrow(/escapes root/);
  });

  it('refuses a contract with no reason, id or declaring actor — an unreviewable boundary', () => {
    expect(() => declareScope(spec({ reason: '  ' }))).toThrow(/carries no reason/);
    expect(() => declareScope(spec({ id: '' }))).toThrow(/has no id/);
    expect(() => declareScope(spec({ declaredBy: '' }))).toThrow(/names no declaring actor/);
  });

  it('refuses an unknown effect instead of ignoring it', () => {
    expect(() => declareScope(spec({ effects: ['sudo' as never] }))).toThrow(/is not one of/);
  });
});

// ─── Narrowing is free ──────────────────────────────────────────────────────

describe('narrowing', () => {
  it('needs no authority and cannot enlarge the scope', () => {
    const scope = narrowScope(declared(), { include: ['src/rulesets/infrastructure/opa'] });
    expect(scope.include).toEqual(['/repo/src/rulesets/infrastructure/opa']);
    expect(hasWidened(scope)).toBe(false);
  });

  it('drops a requested selector that is not already inside the scope, never adds it', () => {
    const scope = narrowScope(declared(), { include: ['src/sdk/cli', 'src/rulesets/sdlc'] });
    expect(scope.include).toEqual(['/repo/src/rulesets/sdlc']);
  });

  it('narrows to nothing when the narrowing input matches nothing, and then refuses every check', () => {
    const scope = narrowScope(declared(), { include: ['src/sdk/cli'] });
    expect(scope.include).toEqual([]);
    const decision = evaluateScope(scope, { path: '/repo/src/rulesets/a.rego', effect: 'read' });
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('SC-R06');
  });

  it('intersects effects rather than replacing them', () => {
    const scope = narrowScope(declared({ effects: ['read', 'write'] }), {
      effects: ['write', 'delete'],
    });
    expect(scope.effects).toEqual(['write']);
  });

  it('unions exclusions, so a carve-out cannot be undone by narrowing again', () => {
    const once = narrowScope(declared(), { exclude: ['src/rulesets/agents'] });
    const twice = narrowScope(once, { exclude: ['src/rulesets/schema'] });
    expect(twice.exclude).toEqual(['/repo/src/rulesets/agents', '/repo/src/rulesets/schema']);
  });
});

// ─── Instance 1 — an error during resolution must not widen ─────────────────

describe('instance 1 — 27-opa-parity-gate promoted itself to FULL scope inside a catch', () => {
  it('yields no scope at all when the resolver throws, so a catch has nothing to fall back to', () => {
    const resolution = resolveScope(declared(), () => {
      throw new Error('fatal: not a git repository');
    });

    expect(resolution.ok).toBe(false);
    // The load-bearing assertion: the failure branch has no `scope` field, so
    // the widening the original bug performed is not expressible.
    expect(resolution).not.toHaveProperty('scope');
    if (!resolution.ok) {
      expect(resolution.reason).toMatch(/never falls back/);
      expect(resolution.cause).toBeInstanceOf(Error);
    }
  });

  it('does not silently substitute the declared scope when resolution returns nothing', () => {
    const resolution = resolveScope(declared(), () => undefined as never);
    expect(resolution.ok).toBe(false);
    expect(resolution).not.toHaveProperty('scope');
  });

  it('throws rather than proceeding when the caller demands a resolved scope', () => {
    expect(() =>
      requireResolvedScope(declared(), () => {
        throw new Error('git diff failed');
      }),
    ).toThrow(ScopeResolutionError);
  });

  it('narrows to the changed paths when resolution succeeds', () => {
    const scope = requireResolvedScope(declared(), () => ({
      include: ['src/rulesets/infrastructure/opa/deny.rego'],
    }));
    expect(scope.include).toEqual(['/repo/src/rulesets/infrastructure/opa/deny.rego']);
    expect(isInScope(scope, { path: '/repo/src/rulesets/infrastructure/opa/deny.rego', effect: 'read' })).toBe(
      true,
    );
    // The rest of the corpus is now out of scope — which is what "scoped" meant.
    expect(isInScope(scope, { path: '/repo/src/rulesets/sdlc/phase-gates.rules.json', effect: 'read' })).toBe(
      false,
    );
  });

  it('refuses fixtures from outside the repo, which is where the 26 phantom fixtures came from', () => {
    const scope = activateScope(declared());
    const decision = evaluateScope(scope, { path: '/tmp/opa-fixtures/deny.rego', effect: 'read' });
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('SC-R02');
  });

  it('reports the divergence between declared and effective scope', () => {
    const scope = narrowScope(declared(), { include: ['src/rulesets/sdlc'] });
    const delta = compareToDeclared(scope);
    expect(delta.identical).toBe(false);
    expect(delta.narrowed).toEqual(['/repo/src/rulesets']);
    expect(delta.widened).toEqual([]);
  });
});

// ─── Instance 2 — the plugin enabled at user scope ──────────────────────────

describe('instance 2 — a plugin enforced a standard over repositories it did not govern', () => {
  it('refuses a path outside the declared root however the operation was invoked', () => {
    const scope = activateScope(
      declared({
        id: 'unimar-core-plugin',
        root: '/repos/unimar-core',
        include: ['.'],
        effects: ['read', 'write'],
        declaredBy: 'unimar-core-plugin',
        reason: 'enforce the unimar architecture standard over the repository that adopted it',
      }),
    );

    const decision = evaluateScope(scope, { path: '/repos/evolith/.harness/manifest.yaml', effect: 'write' });
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('SC-R02');
    expect(decision.reason).toMatch(/outside the declared root/);
  });

  it('does not let even the Board raise the root at runtime — a broader root is a new contract', () => {
    const scope = activateScope(declared({ declaredBy: 'ci-runner' }));
    const outcome = widenScope(scope, {
      authorisedBy: board,
      reason: 'we also want the sibling repository covered',
      include: ['/repos/other'],
    });

    expect(outcome.widened).toBe(false);
    expect(outcome.decision.reason).toMatch(/root is a ceiling/);
  });
});

// ─── Instance 3 — the CI script run for its exit code ───────────────────────

describe('instance 3 — a script invoked for its exit code deleted five tracked files', () => {
  const readOnly = () =>
    activateScope(
      declared({
        id: 'ci-exit-code-sweep',
        include: ['.'],
        effects: ['read', 'execute'],
        declaredBy: 'operator',
        reason: 'collect exit codes from every CI script',
      }),
    );

  it('refuses a delete under a contract that declared only read and execute', () => {
    const decision = evaluateScope(readOnly(), { path: '/repo/MASTER_INDEX.md', effect: 'delete' });
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('SC-R05');
    expect(decision.reason).toMatch(/does not thereby acquire permission to mutate/);
  });

  it('does not treat write or execute as implying delete', () => {
    const scope = activateScope(declared({ effects: ['read', 'write', 'execute'] }));
    expect(isInScope(scope, { path: '/repo/src/rulesets/x.json', effect: 'delete' })).toBe(false);
    expect(isInScope(scope, { path: '/repo/src/rulesets/x.json', effect: 'write' })).toBe(true);
  });

  it('throws a ScopeViolationError naming the rule when the caller requires the scope', () => {
    expect(() => requireScope(readOnly(), { path: '/repo/evolith.yaml', effect: 'delete' })).toThrow(
      ScopeViolationError,
    );
    try {
      requireScope(readOnly(), { path: '/repo/evolith.yaml', effect: 'delete' });
    } catch (error) {
      expect((error as ScopeViolationError).decision.rule).toBe('SC-R05');
      expect((error as ScopeViolationError).code).toBe('SCOPE_VIOLATION');
    }
  });
});

// ─── Widening composes with authority-policy ────────────────────────────────

describe('widening', () => {
  const scope = () => activateScope(declared({ declaredBy: 'ci-runner' }));

  it.each([agent, engine, ci])('refuses a $kind, which may assert but not decide', (actor) => {
    const outcome = widenScope(scope(), {
      authorisedBy: actor,
      reason: 'the diff was empty so we want the whole corpus',
      include: ['src'],
    });
    expect(outcome.widened).toBe(false);
    expect(outcome.decision.rule).toBe('AP-R02');
  });

  it('refuses the actor that declared the scope, because a self-certified boundary carries no information', () => {
    const self = activateScope(declared({ declaredBy: 'winston-agent' }));
    const outcome = widenScope(self, {
      authorisedBy: agent,
      reason: 'I need more room',
      include: ['src'],
    });
    expect(outcome.widened).toBe(false);
    expect(outcome.decision.rule).toBe('AP-R03');
  });

  it('permits a named human and records the widening with its reason on the audit trail', () => {
    const outcome = widenScope(scope(), {
      authorisedBy: person,
      reason: 'ADR-0116 review requires the sdk corpus in the same pass',
      include: ['src/sdk'],
      effects: ['write'],
      at: '2026-07-18T00:00:00.000Z',
    });

    expect(outcome.widened).toBe(true);
    if (!outcome.widened) return;
    expect(outcome.scope.include).toEqual(['/repo/src/rulesets', '/repo/src/sdk']);
    expect(outcome.scope.effects).toEqual(['read', 'write']);
    expect(outcome.scope.widenings).toHaveLength(1);
    expect(outcome.scope.widenings[0]).toMatchObject({
      at: '2026-07-18T00:00:00.000Z',
      byActorId: 'dev@evolith',
      byActorKind: 'human',
      reason: 'ADR-0116 review requires the sdk corpus in the same pass',
      addedInclude: ['/repo/src/sdk'],
      addedEffects: ['write'],
    });
  });

  it('refuses a widening with no written justification even from an authorised human', () => {
    const outcome = widenScope(scope(), {
      authorisedBy: person,
      reason: '   ',
      include: ['src/sdk'],
    });
    expect(outcome.widened).toBe(false);
    expect(outcome.decision.reason).toMatch(/indistinguishable from a silent fallback/);
  });

  it('leaves the original scope untouched — widening produces a new value', () => {
    const original = scope();
    widenScope(original, { authorisedBy: person, reason: 'audit sweep', include: ['src/sdk'] });
    expect(original.include).toEqual(['/repo/src/rulesets']);
    expect(original.widenings).toEqual([]);
  });

  it('surfaces the widening in the declared-versus-effective comparison', () => {
    const outcome = widenScope(scope(), {
      authorisedBy: person,
      reason: 'audit sweep',
      include: ['src/sdk'],
      effects: ['write'],
    });
    if (!outcome.widened) throw new Error('expected the widening to be permitted');

    const delta = compareToDeclared(outcome.scope);
    expect(delta.identical).toBe(false);
    expect(delta.widened).toEqual(['/repo/src/sdk']);
    expect(delta.addedEffects).toEqual(['write']);
    expect(hasWidened(outcome.scope)).toBe(true);
  });
});

// ─── The guard, in detail ───────────────────────────────────────────────────

describe('evaluating a check', () => {
  const scope = () =>
    activateScope(declared({ include: ['src'], exclude: ['src/rulesets/agents'], effects: ['read'] }));

  it('permits a path under a declared subtree with a declared effect', () => {
    const decision = evaluateScope(scope(), { path: '/repo/src/rulesets/x.rego', effect: 'read' });
    expect(decision.permitted).toBe(true);
    expect(decision.rule).toBe('SC-R01');
  });

  it('lets an exclusion beat an inclusion', () => {
    const decision = evaluateScope(scope(), { path: '/repo/src/rulesets/agents/a.json', effect: 'read' });
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('SC-R04');
  });

  it('refuses a path inside the root that no subtree claimed', () => {
    const decision = evaluateScope(scope(), { path: '/repo/reference/core/adrs/x.md', effect: 'read' });
    expect(decision.permitted).toBe(false);
    expect(decision.rule).toBe('SC-R03');
  });

  it('fails closed on a path it cannot position, rather than assuming it is inside', () => {
    for (const path of ['', '   ', '/repo/../etc/passwd', 'src/../../etc']) {
      const decision = evaluateScope(scope(), { path, effect: 'read' });
      expect(decision.permitted).toBe(false);
      expect(decision.rule).toBe('SC-R02');
    }
  });

  it('prefers the outside-the-root refusal over the effect refusal, as the sharper reason', () => {
    const decision = evaluateScope(scope(), { path: '/elsewhere/x', effect: 'delete' });
    expect(decision.rule).toBe('SC-R02');
  });
});

// ─── Reporting ──────────────────────────────────────────────────────────────

describe('reporting', () => {
  it('renders a decision with its rule and citation for a review comment', () => {
    const decision = evaluateScope(activateScope(declared()), { path: '/tmp/x.rego', effect: 'read' });
    const rendered = formatScopeDecision(decision);
    expect(rendered).toContain('[SC-R02] refused:');
    expect(rendered).toContain('Source: UP-004');
  });

  it('states that there was no drift when the operation acted over exactly what it declared', () => {
    expect(formatScopeContract(activateScope(declared()))).toContain('drift:     none');
  });

  it('names the person and the reason for every widening in the audit line', () => {
    const outcome = widenScope(activateScope(declared({ declaredBy: 'ci-runner' })), {
      authorisedBy: person,
      reason: 'ADR-0116 review',
      include: ['src/sdk'],
      at: '2026-07-18T00:00:00.000Z',
    });
    if (!outcome.widened) throw new Error('expected the widening to be permitted');
    const rendered = formatScopeContract(outcome.scope);
    expect(rendered).toContain('widened:   2026-07-18T00:00:00.000Z by dev@evolith (human) — ADR-0116 review');
    expect(rendered).toContain('effective: /repo/src/rulesets, /repo/src/sdk');
  });
});

// ─── Containment ────────────────────────────────────────────────────────────

describe('containment', () => {
  it.each([
    ['/repo', '/repo', true],
    ['/repo', '/repo/src', true],
    ['/repo', '/repository', false],
    ['/repo/src', '/repo', false],
    ['/', '/anything', true],
    ['/repo', '/repo/../etc', false],
    ['/repo', '', false],
  ])('isWithin(%s, %s) === %s', (parent, child, expected) => {
    expect(isWithin(parent as string, child as string)).toBe(expected);
  });

  it('treats windows separators and redundant slashes as the same path', () => {
    const scope = activateScope(declared({ include: ['src//rulesets/'] }));
    expect(isInScope(scope, { path: '\\repo\\src\\rulesets\\x.json', effect: 'read' })).toBe(true);
  });
});
