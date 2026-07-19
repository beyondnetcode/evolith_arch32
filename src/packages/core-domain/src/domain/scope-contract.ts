/**
 * The scope boundary (UP-004 §II.2) — the single place that decides *over what*
 * an operation may act, and refuses to let that answer grow while it runs.
 *
 * WHAT THIS EXISTS TO PREVENT
 *
 * Three measured incidents in this repository share one shape: **the real blast
 * radius exceeded the assumed blast radius, and nothing surfaced the
 * difference.**
 *
 *   1. `27-opa-parity-gate.mjs` caught an exception from `git diff` and, inside
 *      the `catch`, promoted itself from scoped to FULL evaluation. A *failure*
 *      widened the operation. It then evaluated 26 fixtures from `/tmp` and 0
 *      from the repo root, exiting 0 both times.
 *   2. A plugin enforced one organisation's standard over every repository the
 *      user opened, because it was enabled at *user* scope rather than at the
 *      scope of the repos it governs.
 *   3. An operator ran every CI script in a loop to collect exit codes,
 *      including one that mutates the repo, and deleted five tracked files.
 *
 * One widened on error, one widened by default, one widened by unchecked
 * invocation. So this module refuses in three matching ways: an error during
 * resolution yields no scope at all (never a wider one), a scope must be
 * declared before it runs rather than inherited from ambient configuration, and
 * an effect the contract did not declare is refused however the operation was
 * invoked.
 *
 * THE ASYMMETRY THAT DOES THE WORK
 *
 * Narrowing is free — a smaller blast radius needs no justification, so
 * `narrowScope` takes no authorisation and cannot fail. Widening is an act of
 * authority: it requires a named human, a written reason, and it is recorded on
 * the scope itself. There is deliberately **no other constructor that produces a
 * broader scope**, which is what makes an accidental widening hard to write
 * rather than merely discouraged:
 *
 *   - `resolveScope` returns a discriminated union whose failure branch carries
 *     *no scope field*. A `catch` cannot fall back to a wider scope because the
 *     error path has nothing to fall back to. Instance 1 is unwritable here.
 *   - `narrowScope` intersects; a selector that is not already inside the scope
 *     is dropped, never added. Its return type can only shrink.
 *   - `widenScope` is the sole widening path and demands a `ScopeWideningRequest`
 *     with a mandatory `reason` and a human `authorisedBy`.
 *   - `root` is a hard ceiling that widening cannot cross at all. A broader root
 *     is a *new contract, declared before execution* — never an adjustment made
 *     by a running operation. Instance 2 is unreachable from inside a run.
 *
 * DECLARED VERSUS EFFECTIVE
 *
 * The two are separate types, and both are kept. `DeclaredScope` is what the
 * operation announced before it ran; `EffectiveScope` is what it actually
 * operated over, carrying its provenance back to the declaration and an audit
 * trail of every widening. `compareToDeclared` reports the difference, because
 * instance 1 is exactly the case where the two diverged and nothing said so.
 *
 * WHAT THIS MODULE IS NOT
 *
 * It is not `authority-policy`, and it does not restate it. That module answers
 * "may this actor do this?"; this one answers "over what may it do it?". They
 * compose: widening a declared scope is treated as a `waive` — it excuses a
 * boundary the operation itself published — so `evaluateAuthority` supplies the
 * refusal, including the self-authorization refusal (AP-R03) that stops an
 * operation widening the contract it wrote. UP-004 Part VIII lists "widen its
 * own scope on failure" among the acts an agent must never take automatically;
 * that listing is enforced here by delegation, not by a second copy of the rule.
 *
 * It is also not a path matcher. Containment is plain prefix containment on
 * normalised POSIX paths — see `NOT ENCODED` at the foot of this file.
 */

import {
  Actor,
  AuthorityDecision,
  evaluateAuthority,
} from './authority-policy';
import { EvolithError } from './errors';

// ─── Effects ────────────────────────────────────────────────────────────────

/**
 * What an operation may *do* to the things in its scope.
 *
 * Deliberately non-hierarchical: `write` does not imply `read`, and nothing
 * implies `delete`. Implication is a silent widening — instance 3 is precisely
 * an operation assumed to be `read` that held `delete`. Every effect an
 * operation needs is named, or refused.
 */
export type ScopeEffect = 'read' | 'write' | 'delete' | 'execute' | 'network';

const KNOWN_EFFECTS: readonly ScopeEffect[] = [
  'read',
  'write',
  'delete',
  'execute',
  'network',
];

// ─── Path handling ──────────────────────────────────────────────────────────

/**
 * Normalise to a comparable POSIX form. This *rejects* `..` rather than
 * resolving it: resolving traversal against a root is the kind of cleverness
 * that turns a boundary into a suggestion, and a rejected selector fails closed
 * whereas a mis-resolved one fails open.
 */
function normalisePath(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const unified = trimmed.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  const segments = unified.split('/');
  if (segments.some((segment) => segment === '..')) return null;

  const cleaned = segments.filter((segment) => segment !== '.' && segment !== '');
  const absolute = unified.startsWith('/');
  const body = cleaned.join('/');
  if (body.length === 0) return absolute ? '/' : null;
  return absolute ? `/${body}` : body;
}

/** True when `child` is `parent` itself or lies beneath it. */
export function isWithin(parent: string, child: string): boolean {
  const p = normalisePath(parent);
  const c = normalisePath(child);
  if (p === null || c === null) return false;
  if (p === c) return true;
  if (p === '/') return c.startsWith('/');
  return c.startsWith(`${p}/`);
}

/**
 * True for a selector that names the root itself (`.`, `./`, `.//.`). Written
 * out rather than folded into `normalisePath` because "the whole of my root" is
 * a legitimate declaration, whereas an empty path is a missing one, and the two
 * must not collapse into the same value.
 */
function isSelfSelector(raw: string): boolean {
  const segments = raw.trim().replace(/\\/g, '/').split('/');
  return (
    raw.trim().length > 0 &&
    !raw.trim().startsWith('/') &&
    segments.every((segment) => segment === '.' || segment === '')
  );
}

/** Interpret a selector against a root, yielding an absolute-under-root path. */
function anchor(root: string, selector: string): string | null {
  if (typeof selector === 'string' && isSelfSelector(selector)) return normalisePath(root);
  const normalised = normalisePath(selector);
  if (normalised === null) return null;
  const candidate = normalised.startsWith('/')
    ? normalised
    : normalisePath(root === '/' ? `/${normalised}` : `${root}/${normalised}`);
  if (candidate === null) return null;
  return isWithin(root, candidate) ? candidate : null;
}

// ─── Declaration ────────────────────────────────────────────────────────────

/** What an operation announces, before it runs, that it is allowed to touch. */
export interface ScopeSpec {
  /** Stable identifier for the operation. Named in every refusal and audit line. */
  readonly id: string;
  /**
   * The hard ceiling. Nothing inside this contract may ever refer outside it,
   * and no widening may cross it — a broader root is a new declaration.
   */
  readonly root: string;
  /** Subtrees the operation may touch. Must be non-empty. */
  readonly include: readonly string[];
  /** Subtrees carved back out of `include`. Exclusions always win. */
  readonly exclude?: readonly string[];
  /** Effects the operation may exercise. Must be non-empty. */
  readonly effects: readonly ScopeEffect[];
  /** Actor id that declared it. Drives the self-authorization refusal on widening. */
  readonly declaredBy: string;
  /** Why this scope and not a broader one. Written for a review comment. */
  readonly reason: string;
}

/**
 * A validated declaration. Inspectable before the operation runs, which is the
 * whole point: a scope that can only be known afterwards cannot be reviewed.
 */
export interface DeclaredScope {
  readonly state: 'declared';
  readonly id: string;
  readonly root: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly effects: readonly ScopeEffect[];
  readonly declaredBy: string;
  readonly reason: string;
}

/** A widening that happened, recorded so the audit trail names a person. */
export interface ScopeWidening {
  readonly at: string;
  readonly byActorId: string;
  readonly byActorKind: string;
  readonly reason: string;
  readonly addedInclude: readonly string[];
  readonly addedEffects: readonly ScopeEffect[];
  /** The `authority-policy` decision that permitted it. */
  readonly decision: AuthorityDecision;
}

/**
 * What the operation actually operates over. Distinct from `DeclaredScope` on
 * purpose: functions that *do* things take an `EffectiveScope`, so the act of
 * moving from declaration to execution is a visible step rather than an
 * assumption, and the two can be compared afterwards.
 */
export interface EffectiveScope {
  readonly state: 'effective';
  readonly declared: DeclaredScope;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly effects: readonly ScopeEffect[];
  /** Empty for any scope that only ever narrowed. */
  readonly widenings: readonly ScopeWidening[];
}

export class ScopeContractError extends EvolithError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'SCOPE_CONTRACT_INVALID', context);
    this.name = 'ScopeContractError';
  }
}

/**
 * Validate and freeze a declaration, **failing closed**.
 *
 * Every rejected input here is one that would otherwise resolve to "no
 * boundary": an empty `include` reads as "no restriction" at a call site that
 * forgot to check, and a selector escaping the root is the plugin incident. The
 * convention mirrors `.harness/scripts/lib/paths.mjs` — a boundary that cannot
 * be determined is a loud failure at the first call, never a quiet default.
 */
export function declareScope(spec: ScopeSpec): DeclaredScope {
  const fail = (detail: string): never => {
    throw new ScopeContractError(
      `[scope] FAIL-CLOSED: scope contract "${spec?.id ?? '<unnamed>'}" is not declarable: ${detail}\n` +
        `  A scope that cannot be determined must refuse to run. Do not substitute a default —\n` +
        `  the default is always broader than the scope you failed to state.`,
      { scopeId: spec?.id },
    );
  };

  if (!spec || typeof spec !== 'object') return fail('no specification was supplied.');
  if (!spec.id?.trim()) return fail('it has no id, so no refusal could name it.');
  if (!spec.declaredBy?.trim()) return fail('it names no declaring actor, so no widening could be attributed.');
  if (!spec.reason?.trim()) return fail('it carries no reason, and an unexplained boundary cannot be reviewed.');

  const root = normalisePath(spec.root ?? '');
  if (root === null) {
    return fail(`root "${spec.root}" is empty or contains a ".." traversal segment.`);
  }

  if (!Array.isArray(spec.include) || spec.include.length === 0) {
    return fail('its include list is empty, which reads as "everything" at any call site that forgets to check.');
  }

  const include: string[] = [];
  for (const selector of spec.include) {
    const anchored = anchor(root, selector);
    if (anchored === null) {
      return fail(`include selector "${selector}" is empty, traverses upward, or escapes root "${root}".`);
    }
    if (!include.includes(anchored)) include.push(anchored);
  }

  const exclude: string[] = [];
  for (const selector of spec.exclude ?? []) {
    const anchored = anchor(root, selector);
    // An exclusion outside the root is not dangerous — it excludes nothing that
    // was ever included — but it is a sign the author's mental model is wrong,
    // so it is refused rather than quietly dropped.
    if (anchored === null) {
      return fail(`exclude selector "${selector}" is empty, traverses upward, or escapes root "${root}".`);
    }
    if (!exclude.includes(anchored)) exclude.push(anchored);
  }

  if (!Array.isArray(spec.effects) || spec.effects.length === 0) {
    return fail('it declares no effects; an operation that states no effect may perform none.');
  }
  const effects: ScopeEffect[] = [];
  for (const effect of spec.effects) {
    if (!KNOWN_EFFECTS.includes(effect)) {
      return fail(`effect "${effect}" is not one of: ${KNOWN_EFFECTS.join(', ')}.`);
    }
    if (!effects.includes(effect)) effects.push(effect);
  }

  return Object.freeze({
    state: 'declared',
    id: spec.id.trim(),
    root,
    include: Object.freeze(include),
    exclude: Object.freeze(exclude),
    effects: Object.freeze(effects),
    declaredBy: spec.declaredBy.trim(),
    reason: spec.reason.trim(),
  });
}

/**
 * Enter execution at exactly the declared boundary. The identity step — present
 * so that reaching an `EffectiveScope` is always an explicit act.
 */
export function activateScope(declared: DeclaredScope): EffectiveScope {
  return Object.freeze({
    state: 'effective',
    declared,
    include: declared.include,
    exclude: declared.exclude,
    effects: declared.effects,
    widenings: Object.freeze([] as ScopeWidening[]),
  });
}

// ─── Narrowing — free, and the only unauthorised transition ─────────────────

/** A request to shrink. Nothing here can enlarge the scope. */
export interface ScopeNarrowing {
  /** Kept only where already inside the current include set; never added. */
  readonly include?: readonly string[];
  /** Unioned onto the existing exclusions. */
  readonly exclude?: readonly string[];
  /** Intersected with the existing effects. */
  readonly effects?: readonly ScopeEffect[];
}

/**
 * Restrict a scope. Total, unauthorised and non-throwing, because a smaller
 * blast radius never needs justifying.
 *
 * A selector that is not already inside the scope is **dropped, not added** —
 * so narrowing from an untrusted source (a `git diff`, a CLI flag, a plugin
 * config) can only ever reduce what the operation touches. Narrowing to nothing
 * is permitted and leaves a scope that refuses every check, which is the correct
 * outcome when the narrowing input turned out to be empty.
 */
export function narrowScope(
  scope: DeclaredScope | EffectiveScope,
  narrowing: ScopeNarrowing,
): EffectiveScope {
  const current = scope.state === 'declared' ? activateScope(scope) : scope;
  const root = current.declared.root;

  let include = current.include;
  if (narrowing.include !== undefined) {
    const next: string[] = [];
    for (const selector of narrowing.include) {
      const anchored = anchor(root, selector);
      if (anchored === null) continue;
      if (!current.include.some((existing) => isWithin(existing, anchored))) continue;
      if (!next.includes(anchored)) next.push(anchored);
    }
    include = Object.freeze(next);
  }

  let exclude = current.exclude;
  if (narrowing.exclude !== undefined) {
    const next = [...current.exclude];
    for (const selector of narrowing.exclude) {
      const anchored = anchor(root, selector);
      if (anchored === null) continue;
      if (!next.includes(anchored)) next.push(anchored);
    }
    exclude = Object.freeze(next);
  }

  let effects = current.effects;
  if (narrowing.effects !== undefined) {
    effects = Object.freeze(current.effects.filter((effect) => narrowing.effects!.includes(effect)));
  }

  return Object.freeze({
    state: 'effective',
    declared: current.declared,
    include,
    exclude,
    effects,
    widenings: current.widenings,
  });
}

// ─── Fallible resolution — the antidote to instance 1 ───────────────────────

/**
 * The outcome of determining a scope from something that can fail.
 *
 * The failure branch **carries no scope**. That is the entire design: a `catch`
 * around scope resolution has nothing to fall back to, so the
 * `27-opa-parity-gate` bug — an exception handler promoting a scoped run to a
 * full one — cannot be expressed against this type without the author writing a
 * fresh `declareScope` call and a widening, both of which are visible in review.
 */
export type ScopeResolution =
  | { readonly ok: true; readonly scope: EffectiveScope }
  | { readonly ok: false; readonly reason: string; readonly cause?: unknown };

export class ScopeResolutionError extends EvolithError {
  constructor(
    public readonly scopeId: string,
    reason: string,
    public readonly cause?: unknown,
  ) {
    super(reason, 'SCOPE_RESOLUTION_FAILED', { scopeId });
    this.name = 'ScopeResolutionError';
  }
}

/**
 * Narrow a declared scope using a fallible source, failing closed.
 *
 * Typical use: an operation declares the repository as its root and the whole
 * tree as its include, then narrows to the changed files reported by `git diff`.
 * If that command throws, the correct answer is *not* "evaluate everything" —
 * it is "we do not know what to evaluate, so we stop".
 */
export function resolveScope(
  declared: DeclaredScope,
  resolver: () => ScopeNarrowing,
): ScopeResolution {
  let narrowing: ScopeNarrowing;
  try {
    narrowing = resolver();
  } catch (cause) {
    return {
      ok: false,
      reason:
        `Scope resolution for "${declared.id}" failed: ${cause instanceof Error ? cause.message : String(cause)}. ` +
        `The operation is refused. A failure to determine scope narrows to nothing; it never falls back to the ` +
        `declared or to a broader scope, because a run whose boundary is unknown has an unbounded blast radius.`,
      cause,
    };
  }

  if (narrowing === undefined || narrowing === null) {
    return {
      ok: false,
      reason:
        `Scope resolution for "${declared.id}" produced no narrowing. An absent result is not an empty ` +
        `restriction — it is an unanswered question, and it is refused rather than defaulted to the declared scope.`,
    };
  }

  return { ok: true, scope: narrowScope(declared, narrowing) };
}

/** `resolveScope`, for call sites that would only rethrow. */
export function requireResolvedScope(
  declared: DeclaredScope,
  resolver: () => ScopeNarrowing,
): EffectiveScope {
  const resolution = resolveScope(declared, resolver);
  if (!resolution.ok) {
    throw new ScopeResolutionError(declared.id, resolution.reason, resolution.cause);
  }
  return resolution.scope;
}

// ─── Widening — an act of authority, never a fallback ───────────────────────

export interface ScopeWideningRequest {
  /** The human accountable for the enlarged blast radius. */
  readonly authorisedBy: Actor;
  /** Written for the audit trail and for pasting into a review comment. */
  readonly reason: string;
  readonly include?: readonly string[];
  readonly effects?: readonly ScopeEffect[];
  /** Injectable for deterministic records; defaults to now. */
  readonly at?: string;
}

export type ScopeWideningOutcome =
  | { readonly widened: true; readonly scope: EffectiveScope; readonly decision: AuthorityDecision }
  | { readonly widened: false; readonly decision: AuthorityDecision };

/**
 * The only path that produces a broader scope.
 *
 * Authority is delegated to `evaluateAuthority` as a `waive`: widening excuses a
 * boundary the operation itself published, which is exactly what a waiver is.
 * Delegating rather than re-checking buys two refusals for free — AP-R02 (an
 * agent, engine or CI job may not authorise it at all) and AP-R03 (the actor
 * that declared the scope may not widen it, because a boundary certified by the
 * process it constrains carries no information).
 *
 * The root is not widenable under any authority. A run that needs a bigger root
 * needs a new contract, declared before it starts.
 */
export function widenScope(
  scope: EffectiveScope,
  request: ScopeWideningRequest,
): ScopeWideningOutcome {
  const decision = evaluateAuthority({
    actor: request.authorisedBy,
    action: 'waive',
    artefact: {
      id: scope.declared.id,
      kind: 'scope-contract',
      authoredBy: scope.declared.declaredBy,
    },
  });

  if (!decision.permitted) return { widened: false, decision };

  if (!request.reason?.trim()) {
    return {
      widened: false,
      decision: {
        permitted: false,
        reason:
          `Widening of scope contract "${scope.declared.id}" carries no reason. A widening without a written ` +
          `justification is indistinguishable from a silent fallback, which is the defect this contract exists to prevent.`,
        rule: decision.rule,
        citation: 'UP-004 §II.2 (silent scope promotion)',
      },
    };
  }

  const root = scope.declared.root;
  const addedInclude: string[] = [];
  for (const selector of request.include ?? []) {
    const anchored = anchor(root, selector);
    if (anchored === null) {
      return {
        widened: false,
        decision: {
          permitted: false,
          reason:
            `Scope contract "${scope.declared.id}" may not be widened to "${selector}": it lies outside the ` +
            `declared root "${root}". The root is a ceiling that no authority raises at runtime — a broader root ` +
            `is a new contract, declared before execution. Enforcing a standard over a repository that never ` +
            `declared it is the second incident in UP-004 §II.2.`,
          rule: decision.rule,
          citation: 'UP-004 §II.2 (a plugin enabled at user scope governed repositories it had no authority over)',
        },
      };
    }
    if (!scope.include.some((existing) => isWithin(existing, anchored)) && !addedInclude.includes(anchored)) {
      addedInclude.push(anchored);
    }
  }

  const addedEffects = (request.effects ?? []).filter(
    (effect, index, all) =>
      KNOWN_EFFECTS.includes(effect) && !scope.effects.includes(effect) && all.indexOf(effect) === index,
  );

  const widening: ScopeWidening = Object.freeze({
    at: request.at ?? new Date().toISOString(),
    byActorId: request.authorisedBy.id,
    byActorKind: request.authorisedBy.kind,
    reason: request.reason.trim(),
    addedInclude: Object.freeze(addedInclude),
    addedEffects: Object.freeze(addedEffects),
    decision,
  });

  return {
    widened: true,
    decision,
    scope: Object.freeze({
      state: 'effective',
      declared: scope.declared,
      include: Object.freeze([...scope.include, ...addedInclude]),
      exclude: scope.exclude,
      effects: Object.freeze([...scope.effects, ...addedEffects]),
      widenings: Object.freeze([...scope.widenings, widening]),
    }),
  };
}

// ─── The guard ──────────────────────────────────────────────────────────────

/** Stable identifiers so a refusal cites a rule rather than a paraphrase. */
export type ScopeRuleId =
  | 'SC-R01' // inside the contract
  | 'SC-R02' // outside the declared root
  | 'SC-R03' // inside the root but not included
  | 'SC-R04' // explicitly excluded
  | 'SC-R05' // effect not declared
  | 'SC-R06'; // the scope admits nothing — fail closed

export interface ScopeCheck {
  readonly path: string;
  readonly effect: ScopeEffect;
}

export interface ScopeDecision {
  readonly permitted: boolean;
  /** One sentence, written to be pasted into a review comment verbatim. */
  readonly reason: string;
  readonly rule: ScopeRuleId;
  readonly citation: string;
}

/**
 * Answers "may this operation touch this path in this way?".
 *
 * Ordered so the sharpest refusal wins. A `delete` of a path outside the root is
 * refused by both SC-R02 and SC-R05; SC-R02 runs first because "you are looking
 * at something that is not yours" is the reason a reviewer needs.
 */
export function evaluateScope(scope: EffectiveScope, check: ScopeCheck): ScopeDecision {
  const { declared } = scope;
  const path = normalisePath(check.path);

  if (path === null) {
    return {
      permitted: false,
      reason:
        `Scope contract "${declared.id}" refuses "${check.path}": the path is empty or contains a ".." traversal ` +
        `segment, so its position relative to the root cannot be determined. An undeterminable path fails closed.`,
      rule: 'SC-R02',
      citation: 'UP-004 §II.2; .harness/scripts/lib/paths.mjs (fail-closed resolution)',
    };
  }

  // SC-R02 — the ceiling. Instance 2.
  if (!isWithin(declared.root, path)) {
    return {
      permitted: false,
      reason:
        `Scope contract "${declared.id}" refuses "${path}": it lies outside the declared root "${declared.root}". ` +
        `An operation may not act on something it never declared, however it was invoked; governing a repository ` +
        `that did not opt in is a widening by default.`,
      rule: 'SC-R02',
      citation: 'UP-004 §II.2 instance 2 (user-scope plugin over ungoverned repositories)',
    };
  }

  // SC-R06 — nothing survives. Instance 1's honest outcome.
  if (scope.include.length === 0 || scope.effects.length === 0) {
    return {
      permitted: false,
      reason:
        `Scope contract "${declared.id}" admits nothing: it narrowed to ${scope.include.length} included ` +
        `subtree(s) and ${scope.effects.length} effect(s). A scope that resolved to nothing means the boundary is ` +
        `unknown, not that everything is permitted, so every check is refused until it is re-declared.`,
      rule: 'SC-R06',
      citation: 'UP-004 §II.2 instance 1 (a failed resolution must narrow, never widen)',
    };
  }

  // SC-R04 — exclusions win over inclusions, always.
  const excluded = scope.exclude.find((selector) => isWithin(selector, path));
  if (excluded !== undefined) {
    return {
      permitted: false,
      reason:
        `Scope contract "${declared.id}" refuses "${path}": it is under the excluded subtree "${excluded}". ` +
        `Exclusions take precedence over inclusions so that carving something out cannot be undone by a broader include.`,
      rule: 'SC-R04',
      citation: 'UP-004 §II.2',
    };
  }

  // SC-R03 — in the root, but never claimed.
  const included = scope.include.find((selector) => isWithin(selector, path));
  if (included === undefined) {
    return {
      permitted: false,
      reason:
        `Scope contract "${declared.id}" refuses "${path}": it is inside the root but not inside any declared ` +
        `subtree (${scope.include.join(', ')}). The effective scope is narrower than the root, and the difference ` +
        `is the point — widen it explicitly, with a reason, or leave the path alone.`,
      rule: 'SC-R03',
      citation: 'UP-004 §II.2',
    };
  }

  // SC-R05 — the effect. Instance 3.
  if (!scope.effects.includes(check.effect)) {
    return {
      permitted: false,
      reason:
        `Scope contract "${declared.id}" refuses to "${check.effect}" "${path}": it declared only ` +
        `${scope.effects.join(', ')}. Effects do not imply one another — an operation invoked to collect an exit ` +
        `code does not thereby acquire permission to mutate the tree.`,
      rule: 'SC-R05',
      citation: 'UP-004 §II.2 instance 3 (a CI script run for its exit code deleted five tracked files)',
    };
  }

  return {
    permitted: true,
    reason:
      `Scope contract "${declared.id}" permits "${check.effect}" on "${path}": it lies under the declared subtree ` +
      `"${included}" and "${check.effect}" is a declared effect.`,
    rule: 'SC-R01',
    citation: 'UP-004 §II.2',
  };
}

/** Convenience predicate for call sites that only need the boolean. */
export function isInScope(scope: EffectiveScope, check: ScopeCheck): boolean {
  return evaluateScope(scope, check).permitted;
}

export class ScopeViolationError extends EvolithError {
  constructor(
    public readonly decision: ScopeDecision,
    public readonly scopeId: string,
    public readonly check: ScopeCheck,
  ) {
    super(decision.reason, 'SCOPE_VIOLATION', {
      rule: decision.rule,
      citation: decision.citation,
      scopeId,
      path: check.path,
      effect: check.effect,
    });
    this.name = 'ScopeViolationError';
  }
}

/** Throws `ScopeViolationError` unless the check is permitted. */
export function requireScope(scope: EffectiveScope, check: ScopeCheck): void {
  const decision = evaluateScope(scope, check);
  if (!decision.permitted) {
    throw new ScopeViolationError(decision, scope.declared.id, check);
  }
}

// ─── Declared versus effective ──────────────────────────────────────────────

export interface ScopeDelta {
  readonly identical: boolean;
  /** Declared subtrees no longer reachable. */
  readonly narrowed: readonly string[];
  /** Subtrees present now that the declaration did not cover. Always widened explicitly. */
  readonly widened: readonly string[];
  /** Declared effects that were given up. */
  readonly droppedEffects: readonly ScopeEffect[];
  /** Effects acquired after declaration. Always widened explicitly. */
  readonly addedEffects: readonly ScopeEffect[];
  /** Every widening on the record, in order. */
  readonly widenings: readonly ScopeWidening[];
}

/**
 * Report how the effective scope differs from the declared one.
 *
 * This exists because instance 1 is not "a check ran with the wrong scope" — it
 * is "a check ran with a scope nobody could compare to the one it announced".
 * Making the difference a value means a run can be audited after the fact
 * instead of reconstructed from a log.
 */
export function compareToDeclared(scope: EffectiveScope): ScopeDelta {
  const { declared } = scope;
  const narrowed = declared.include.filter(
    (selector) => !scope.include.some((current) => isWithin(current, selector)),
  );
  const widened = scope.include.filter(
    (selector) => !declared.include.some((original) => isWithin(original, selector)),
  );
  const droppedEffects = declared.effects.filter((effect) => !scope.effects.includes(effect));
  const addedEffects = scope.effects.filter((effect) => !declared.effects.includes(effect));

  return {
    identical:
      narrowed.length === 0 &&
      widened.length === 0 &&
      droppedEffects.length === 0 &&
      addedEffects.length === 0,
    narrowed,
    widened,
    droppedEffects,
    addedEffects,
    widenings: scope.widenings,
  };
}

/** True when the scope grew relative to its declaration. */
export function hasWidened(scope: EffectiveScope): boolean {
  const delta = compareToDeclared(scope);
  return delta.widened.length > 0 || delta.addedEffects.length > 0 || delta.widenings.length > 0;
}

// ─── Reporting ──────────────────────────────────────────────────────────────

/** Renders a decision as a review comment, rule and citation included. */
export function formatScopeDecision(decision: ScopeDecision): string {
  const verdict = decision.permitted ? 'permitted' : 'refused';
  return [`[${decision.rule}] ${verdict}: ${decision.reason}`, `Source: ${decision.citation}`].join('\n');
}

/**
 * Renders the contract and its drift as an audit-trail entry.
 *
 * Every widening is listed with its author and reason, because a widening that
 * is permitted but unreadable is only marginally better than a silent one.
 */
export function formatScopeContract(scope: EffectiveScope): string {
  const { declared } = scope;
  const delta = compareToDeclared(scope);
  const lines = [
    `Scope contract "${declared.id}" declared by ${declared.declaredBy}: ${declared.reason}`,
    `  root:      ${declared.root}`,
    `  declared:  ${declared.include.join(', ')} [${declared.effects.join(', ')}]`,
    `  effective: ${scope.include.length > 0 ? scope.include.join(', ') : '(nothing)'} [${
      scope.effects.length > 0 ? scope.effects.join(', ') : '(none)'
    }]`,
  ];
  if (scope.exclude.length > 0) lines.push(`  excluded:  ${scope.exclude.join(', ')}`);
  lines.push(
    delta.identical
      ? '  drift:     none — the operation acted over exactly what it declared.'
      : `  drift:     narrowed=[${delta.narrowed.join(', ')}] widened=[${delta.widened.join(', ')}] ` +
        `effects -[${delta.droppedEffects.join(', ')}] +[${delta.addedEffects.join(', ')}]`,
  );
  for (const widening of scope.widenings) {
    lines.push(
      `  widened:   ${widening.at} by ${widening.byActorId} (${widening.byActorKind}) — ${widening.reason}`,
    );
  }
  return lines.join('\n');
}

/*
 * NOT ENCODED — deliberately, and each for a reason.
 *
 * - **Glob and regex selectors.** Containment is plain prefix containment. A
 *   matcher expressive enough to be convenient is expressive enough to be wrong
 *   in a direction nobody notices, and a scope matcher that is wrong *outward*
 *   reproduces the defect. A caller needing patterns should expand them itself
 *   and declare the result, which is inspectable.
 * - **Filesystem access.** Nothing here calls `existsSync`. UP-004 §II.1 is
 *   explicit that a path existing does not mean anything was examined; this
 *   module answers "was it permitted?", and `assertScanned` answers "was it
 *   actually read?". Merging them would let a passing scope check imply
 *   coverage.
 * - **Which office may widen.** `evaluateAuthority` settles that *a human* is
 *   required; which human belongs to `domain/rbac`. AP-R06's separation is
 *   inherited rather than re-litigated here.
 * - **Effect hierarchies.** No `write ⟹ read`, no `admin` superset. Every
 *   implication is a widening nobody wrote down.
 * - **Automatic scope inference.** No helper derives a scope from a cwd, an
 *   environment variable or a config file. All three incidents began with a
 *   scope that came from ambient state rather than from a declaration.
 */
