/**
 * @file scope.mjs
 * @description Scope boundary for harness checks — a failure to determine scope
 *              narrows to nothing, and never widens (UP-004 §II.2, instance 1).
 *
 * ## The defect class this closes
 *
 * `27-opa-parity-gate.mjs` determined its evaluation scope from `git diff`. That call
 * inherited the process cwd, so invoked outside the repository it threw, landed in the
 * `catch`, and returned `null` — which the downstream `scopeTopologies` reads as "no diff
 * context, evaluate everything". A *failure* promoted the run from scoped to FULL. It
 * then evaluated 26 fixtures from `/tmp` and 0 from the repo root, exiting 0 both times.
 *
 * GT-556 pinned the `cwd` and fixed that symptom. The structure that produced it —
 * `catch` returning a value the caller widens on — was untouched, and is the actual
 * defect. This module removes the ability to express it.
 *
 * ## The asymmetry that does the work
 *
 * `resolveScope` returns a discriminated union whose failure branch **carries no scope
 * field**. A `catch` has nothing to fall back to: there is no wider scope available on
 * the error path, so the widening cannot be written by accident. `narrowScope`
 * intersects — a selector not already inside the scope is dropped, never added — so a
 * narrowing sourced from something untrusted (a `git diff`, a CLI flag) can only ever
 * reduce what the check touches.
 *
 * ## No widening path, deliberately
 *
 * The TypeScript contract this mirrors (`core-domain/src/domain/scope-contract.ts`)
 * permits widening, but only as an act of authority: a named human, a written reason, an
 * audit record. A CI script has no human at the keyboard and no actor to attribute a
 * waiver to, so **this port has no `widenScope` at all**. A harness check that needs a
 * broader scope declares it before it runs — `EVOLITH_PARITY_FULL=true` is exactly that,
 * a full scope declared up front rather than one a running operation talked itself into.
 *
 * ## Why this is a port and not an import
 *
 * `scope-contract.ts` is TypeScript inside `@beyondnet/evolith-core-domain`, consumed
 * from `dist/`. `dist/` is gitignored, the parity workflow never builds core-domain, and
 * no harness script imports a workspace package — the harness runs on node builtins so
 * that the checks which gate the build do not themselves depend on the build. Importing
 * the built package here would create a bootstrap cycle and fail in CI. The influence
 * already runs in this direction: `scope-contract.ts` cites
 * `.harness/scripts/lib/paths.mjs` as the fail-closed convention it mirrors.
 *
 * Keep the two in step by hand. The invariant, not the API surface, is what must match:
 * **an error while determining scope must not produce a broader scope than declared.**
 */

/** Effects a check may exercise. Non-hierarchical: `write` does not imply `read`. */
const KNOWN_EFFECTS = ['read', 'write', 'delete', 'execute', 'network'];

/** Thrown when a scope cannot be declared. Distinct class so callers can tell it apart. */
export class ScopeContractError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ScopeContractError';
    this.details = details;
  }
}

/** Thrown by `requireResolvedScope` when resolution failed. Carries no scope. */
export class ScopeResolutionError extends Error {
  constructor(scopeId, reason, cause) {
    super(reason);
    this.name = 'ScopeResolutionError';
    this.scopeId = scopeId;
    this.cause = cause;
  }
}

/**
 * Normalise to a comparable POSIX form. `..` is *rejected*, not resolved: resolving
 * traversal against a root turns a boundary into a suggestion, and a rejected selector
 * fails closed whereas a mis-resolved one fails open.
 *
 * @param {string} raw
 * @returns {string|null} normalised path, or null when undeterminable
 */
function normalisePath(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const unified = trimmed.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  const segments = unified.split('/');
  if (segments.some((s) => s === '..')) return null;

  const cleaned = segments.filter((s) => s !== '.' && s !== '');
  const absolute = unified.startsWith('/');
  const body = cleaned.join('/');
  if (body.length === 0) return absolute ? '/' : null;
  return absolute ? `/${body}` : body;
}

/**
 * True when `child` is `parent` itself or lies beneath it. Plain prefix containment —
 * no globs, no regex. A matcher expressive enough to be convenient is expressive enough
 * to be wrong outward, which reproduces the defect.
 *
 * @param {string} parent
 * @param {string} child
 * @returns {boolean}
 */
export function isWithin(parent, child) {
  const p = normalisePath(parent);
  const c = normalisePath(child);
  if (p === null || c === null) return false;
  if (p === c) return true;
  if (p === '/') return c.startsWith('/');
  return c.startsWith(`${p}/`);
}

/** True for a selector naming the root itself (`.`, `./`). */
function isSelfSelector(raw) {
  if (typeof raw !== 'string') return false;
  const t = raw.trim();
  if (t.length === 0 || t.startsWith('/')) return false;
  return t.replace(/\\/g, '/').split('/').every((s) => s === '.' || s === '');
}

/** Interpret a selector against a root, yielding an absolute-under-root path or null. */
function anchor(root, selector) {
  if (isSelfSelector(selector)) return normalisePath(root);
  const normalised = normalisePath(selector);
  if (normalised === null) return null;
  const candidate = normalised.startsWith('/')
    ? normalised
    : normalisePath(root === '/' ? `/${normalised}` : `${root}/${normalised}`);
  if (candidate === null) return null;
  return isWithin(root, candidate) ? candidate : null;
}

/**
 * Validate and freeze a declaration, failing closed.
 *
 * Every rejected input is one that would otherwise read as "no boundary" — an empty
 * `include` reads as "everything" at a call site that forgot to check.
 *
 * @param {object} spec
 * @param {string} spec.id          stable identifier, named in every refusal
 * @param {string} spec.root        hard ceiling; nothing may refer outside it
 * @param {string[]} spec.include   subtrees the check may touch; must be non-empty
 * @param {string[]} [spec.exclude] subtrees carved back out; exclusions win
 * @param {string[]} spec.effects   effects the check may exercise; must be non-empty
 * @param {string} spec.declaredBy  who declared it
 * @param {string} spec.reason      why this scope and not a broader one
 * @returns {object} frozen declared scope
 * @throws {ScopeContractError}
 */
export function declareScope(spec) {
  const fail = (detail) => {
    throw new ScopeContractError(
      `[scope] FAIL-CLOSED: scope contract "${spec?.id ?? '<unnamed>'}" is not declarable: ${detail}\n` +
        `  A scope that cannot be determined must refuse to run. Do not substitute a default —\n` +
        `  the default is always broader than the scope you failed to state.`,
      { scopeId: spec?.id },
    );
  };

  if (!spec || typeof spec !== 'object') return fail('no specification was supplied.');
  if (!spec.id?.trim()) return fail('it has no id, so no refusal could name it.');
  if (!spec.declaredBy?.trim()) return fail('it names no declaring actor.');
  if (!spec.reason?.trim()) return fail('it carries no reason, and an unexplained boundary cannot be reviewed.');

  const root = normalisePath(spec.root ?? '');
  if (root === null) return fail(`root "${spec.root}" is empty or contains a ".." traversal segment.`);

  if (!Array.isArray(spec.include) || spec.include.length === 0) {
    return fail('its include list is empty, which reads as "everything" at any call site that forgets to check.');
  }

  const include = [];
  for (const selector of spec.include) {
    const anchored = anchor(root, selector);
    if (anchored === null) {
      return fail(`include selector "${selector}" is empty, traverses upward, or escapes root "${root}".`);
    }
    if (!include.includes(anchored)) include.push(anchored);
  }

  const exclude = [];
  for (const selector of spec.exclude ?? []) {
    const anchored = anchor(root, selector);
    if (anchored === null) {
      return fail(`exclude selector "${selector}" is empty, traverses upward, or escapes root "${root}".`);
    }
    if (!exclude.includes(anchored)) exclude.push(anchored);
  }

  if (!Array.isArray(spec.effects) || spec.effects.length === 0) {
    return fail('it declares no effects; a check that states no effect may perform none.');
  }
  const effects = [];
  for (const effect of spec.effects) {
    if (!KNOWN_EFFECTS.includes(effect)) return fail(`effect "${effect}" is not one of: ${KNOWN_EFFECTS.join(', ')}.`);
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
 * Enter execution at exactly the declared boundary. The identity step, present so that
 * reaching an effective scope is always an explicit act.
 *
 * @param {object} declared
 * @returns {object} frozen effective scope
 */
export function activateScope(declared) {
  return Object.freeze({
    state: 'effective',
    declared,
    include: declared.include,
    exclude: declared.exclude,
    effects: declared.effects,
  });
}

/**
 * Restrict a scope. Total, unauthorised and non-throwing — a smaller blast radius never
 * needs justifying. A selector not already inside the scope is dropped, never added, so
 * narrowing from an untrusted source can only reduce. Narrowing to nothing is permitted
 * and leaves a scope that refuses every check, which is the correct outcome when the
 * narrowing input turned out to be empty.
 *
 * @param {object} scope declared or effective
 * @param {{include?: string[], exclude?: string[], effects?: string[]}} narrowing
 * @returns {object} frozen effective scope
 */
export function narrowScope(scope, narrowing) {
  const current = scope.state === 'declared' ? activateScope(scope) : scope;
  const root = current.declared.root;

  let include = current.include;
  if (narrowing.include !== undefined) {
    const next = [];
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
    effects = Object.freeze(current.effects.filter((e) => narrowing.effects.includes(e)));
  }

  return Object.freeze({ state: 'effective', declared: current.declared, include, exclude, effects });
}

/**
 * Narrow a declared scope using a fallible source, failing closed.
 *
 * The failure branch carries **no scope**. That is the entire design: a caller has
 * nothing to fall back to on the error path, so the parity-gate bug cannot be expressed
 * against this return type.
 *
 * @param {object} declared
 * @param {() => ({include?: string[], exclude?: string[], effects?: string[]})} resolver
 * @returns {{ok: true, scope: object} | {ok: false, reason: string, cause?: unknown}}
 */
export function resolveScope(declared, resolver) {
  let narrowing;
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
        `Scope resolution for "${declared.id}" produced no narrowing. An absent result is not an empty restriction — ` +
        `it is an unanswered question, and it is refused rather than defaulted to the declared scope.`,
    };
  }

  return { ok: true, scope: narrowScope(declared, narrowing) };
}

/**
 * `resolveScope`, for call sites that would only rethrow.
 *
 * @param {object} declared
 * @param {() => object} resolver
 * @returns {object} effective scope
 * @throws {ScopeResolutionError}
 */
export function requireResolvedScope(declared, resolver) {
  const resolution = resolveScope(declared, resolver);
  if (!resolution.ok) throw new ScopeResolutionError(declared.id, resolution.reason, resolution.cause);
  return resolution.scope;
}

/**
 * Answers "may this check touch this path in this way?". Ordered so the sharpest refusal
 * wins.
 *
 * @param {object} scope effective scope
 * @param {{path: string, effect: string}} check
 * @returns {{permitted: boolean, reason: string, rule: string}}
 */
export function evaluateScope(scope, check) {
  const { declared } = scope;
  const path = normalisePath(check.path);

  if (path === null) {
    return {
      permitted: false,
      rule: 'SC-R02',
      reason:
        `Scope contract "${declared.id}" refuses "${check.path}": the path is empty or contains a ".." traversal ` +
        `segment, so its position relative to the root cannot be determined. An undeterminable path fails closed.`,
    };
  }

  const anchored = path.startsWith('/') ? path : anchor(declared.root, path);

  // SC-R02 — the ceiling.
  if (anchored === null || !isWithin(declared.root, anchored)) {
    return {
      permitted: false,
      rule: 'SC-R02',
      reason:
        `Scope contract "${declared.id}" refuses "${check.path}": it lies outside the declared root ` +
        `"${declared.root}". A check may not act on something it never declared, however it was invoked.`,
    };
  }

  // SC-R06 — nothing survives. The honest outcome of a narrowing that found nothing.
  if (scope.include.length === 0 || scope.effects.length === 0) {
    return {
      permitted: false,
      rule: 'SC-R06',
      reason:
        `Scope contract "${declared.id}" admits nothing: it narrowed to ${scope.include.length} included ` +
        `subtree(s) and ${scope.effects.length} effect(s). A scope that resolved to nothing means the boundary is ` +
        `unknown, not that everything is permitted, so every check is refused until it is re-declared.`,
    };
  }

  // SC-R04 — exclusions win over inclusions, always.
  const excluded = scope.exclude.find((selector) => isWithin(selector, anchored));
  if (excluded !== undefined) {
    return {
      permitted: false,
      rule: 'SC-R04',
      reason: `Scope contract "${declared.id}" refuses "${check.path}": it is under the excluded subtree "${excluded}".`,
    };
  }

  // SC-R03 — in the root, but never claimed.
  const included = scope.include.find((selector) => isWithin(selector, anchored));
  if (included === undefined) {
    return {
      permitted: false,
      rule: 'SC-R03',
      reason:
        `Scope contract "${declared.id}" refuses "${check.path}": it is inside the root but not inside any ` +
        `included subtree. The effective scope is narrower than the root, and the difference is the point.`,
    };
  }

  // SC-R05 — the effect. Effects do not imply one another.
  if (!scope.effects.includes(check.effect)) {
    return {
      permitted: false,
      rule: 'SC-R05',
      reason:
        `Scope contract "${declared.id}" refuses to "${check.effect}" "${check.path}": it declared only ` +
        `${scope.effects.join(', ')}. A check invoked to collect an exit code does not thereby acquire ` +
        `permission to mutate the tree.`,
    };
  }

  return {
    permitted: true,
    rule: 'SC-R01',
    reason: `Scope contract "${declared.id}" permits "${check.effect}" on "${check.path}" under "${included}".`,
  };
}

/** Convenience predicate for call sites that only need the boolean. */
export function isInScope(scope, check) {
  return evaluateScope(scope, check).permitted;
}

/**
 * Render the contract and its drift for the run log, so the scope a check actually used
 * is readable after the fact rather than reconstructed.
 *
 * @param {object} scope effective scope
 * @returns {string}
 */
export function formatScopeContract(scope) {
  const { declared } = scope;
  const narrowed = declared.include.filter((s) => !scope.include.some((c) => isWithin(c, s)));
  // Rendered for a CI log: the counts and a sample are what a reader acts on; a full dump
  // of every subtree buries the drift line that actually matters.
  const list = (items) => {
    if (items.length === 0) return '(nothing)';
    const rel = items.map((i) => (i.startsWith(`${declared.root}/`) ? i.slice(declared.root.length + 1) : i));
    return rel.length <= 3 ? rel.join(', ') : `${rel.slice(0, 3).join(', ')} (+${rel.length - 3} more)`;
  };
  const lines = [
    `Scope contract "${declared.id}" declared by ${declared.declaredBy}: ${declared.reason}`,
    `  root:      ${declared.root}`,
    `  declared:  ${declared.include.length} subtree(s): ${list(declared.include)} [${declared.effects.join(', ')}]`,
    `  effective: ${scope.include.length} subtree(s): ${list(scope.include)} [${
      scope.effects.length > 0 ? scope.effects.join(', ') : '(none)'
    }]`,
  ];
  if (scope.exclude.length > 0) lines.push(`  excluded:  ${list(scope.exclude)}`);
  lines.push(
    narrowed.length === 0
      ? '  drift:     none — the check acted over exactly what it declared.'
      : `  drift:     narrowed away ${narrowed.length} subtree(s): ${list(narrowed)} (never widened — there is no widening path)`,
  );
  return lines.join('\n');
}
