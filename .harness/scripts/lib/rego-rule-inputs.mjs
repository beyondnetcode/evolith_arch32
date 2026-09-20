/**
 * GT-716 AC1 — which `input` paths each policy rule reads, taken from the OPA
 * compiler's own AST rather than from a regex over the source or a table kept by hand.
 *
 * ## Why the bundle has to say this about itself
 *
 * A Rego body whose fact is missing is undefined: `not input.adapter.schemaValidated`
 * fires (a `failed`), `input.satellite.git.branchNameInvalid` never matches (a `passed`).
 * Neither is a verdict about the repository — it is a verdict about the input, and on a
 * bare `evolith validate` 73 of the 76 rules only the OPA engine decided on a fresh
 * satellite were exactly that (GT-716, measured 2026-09-20). `OpaEvaluator` can only
 * refuse to call an absent fact a verdict if it knows which facts each rule reads, so
 * `compile-opa-wasm.mjs` compiles this map into the bundle as the
 * `evolith/manifest/rule_input_paths` entrypoint, next to `declared_rule_ids` (GT-675).
 *
 * ## What is collected
 *
 * For every rule whose head is `violations contains {"id": "<literal>", …}`, every
 * `input.…` reference reachable from the rule: its body, its head (a message built with
 * `sprintf` from an input value reads that value too), and — transitively — every helper
 * rule or function of the same module the rule refers to (`not has_tracing` reads what
 * `has_tracing` reads). A path stops at the first dynamic segment:
 * `input.satellite.packageJson.dependencies[pkg]` is recorded as
 * `input.satellite.packageJson.dependencies`. Deciding which of those paths is a FACET
 * whose absence means "not evaluated" is the evaluator's business, not the extractor's.
 *
 * Pure: takes the parsed JSON of `opa parse --format json <file>`, returns a Map.
 */

const AGGREGATE_HEAD = 'violations';

function isTerm(node, type) {
  return Boolean(node) && typeof node === 'object' && node.type === type;
}

/** `input.a.b` for a ref rooted at `input`, or null when the ref is rooted elsewhere. */
export function inputPathOfRef(ref) {
  const terms = Array.isArray(ref?.value) ? ref.value : null;
  if (!terms || !isTerm(terms[0], 'var') || terms[0].value !== 'input') return null;
  const segments = ['input'];
  for (const term of terms.slice(1)) {
    if (!isTerm(term, 'string')) break;
    segments.push(term.value);
  }
  return segments.join('.');
}

/** The name a rule is referred to by — `head.name`, or the first var of `head.ref`. */
export function ruleName(rule) {
  const head = rule?.head ?? {};
  if (typeof head.name === 'string') return head.name;
  const first = Array.isArray(head.ref) ? head.ref[0] : null;
  return isTerm(first, 'var') ? first.value : null;
}

/** The literal `"id"` of an object term, or null. */
function idOfObject(term) {
  if (!isTerm(term, 'object')) return null;
  for (const pair of term.value ?? []) {
    const [key, value] = pair;
    if (isTerm(key, 'string') && key.value === 'id') return isTerm(value, 'string') ? value.value : null;
  }
  return null;
}

/** The first object literal carrying an `"id"` anywhere under `node`, depth-first. */
function firstIdLiteral(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const id = firstIdLiteral(child); if (id) return id; } return null; }
  const own = idOfObject(node);
  if (own) return own;
  for (const key of Object.keys(node)) { const id = firstIdLiteral(node[key]); if (id) return id; }
  return null;
}

/**
 * The literal `"id"` a `violations` rule emits, or null.
 *
 * Two authoring styles exist in the corpus: the id in the head
 * (`violations contains {"id": "ACL-01", …} if {…}`) and the id assigned in the body
 * (`violations contains v if { v := {"id": "PG-1-EVIDENCE-01", …} … }`, the
 * phase-gate style). Both are the same declaration; a rule whose id cannot be
 * found as a literal (a projection such as `main.rego`'s aggregations) is not one.
 */
export function ruleIdOf(rule) {
  const head = rule?.head ?? {};
  if (ruleName(rule) !== AGGREGATE_HEAD) return null;
  const inHead = idOfObject(head.key);
  if (inHead) return inHead;
  if (isTerm(head.key, 'var')) return firstIdLiteral(rule.body) ?? firstIdLiteral(rule.else);
  return null;
}

/**
 * Every `input.…` path reachable from `node`, following references to the module's own
 * helper rules and functions. `visited` keeps a self-referential helper from looping and
 * is per top-level rule, so two rules sharing a helper both credit its reads.
 */
function collect(node, ctx) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, ctx);
    return;
  }
  if (node.type === 'ref' && Array.isArray(node.value)) {
    const path = inputPathOfRef(node);
    if (path) ctx.paths.add(path);
    // `all_deps[pkg]` — a ref whose head is one of our helpers.
    const head = node.value[0];
    if (isTerm(head, 'var')) followHelper(head.value, ctx);
    for (const term of node.value) collect(term, ctx);
    return;
  }
  if (node.type === 'var' && typeof node.value === 'string') {
    followHelper(node.value, ctx);
    return;
  }
  for (const key of Object.keys(node)) collect(node[key], ctx);
}

function followHelper(name, ctx) {
  if (name === AGGREGATE_HEAD || ctx.visited.has(name)) return;
  const rules = ctx.helpers.get(name);
  if (!rules) return;
  ctx.visited.add(name);
  for (const rule of rules) collect(rule, ctx);
}

/** Rules grouped by name, so a reference to a helper resolves to ALL its bodies. */
function helpersOf(rules) {
  const byName = new Map();
  for (const rule of rules) {
    const name = ruleName(rule);
    if (!name || name === AGGREGATE_HEAD) continue;
    byName.set(name, [...(byName.get(name) ?? []), rule]);
  }
  return byName;
}

/**
 * @param {object} moduleAst the JSON of `opa parse --format json <policy.rego>`
 * @returns {Map<string, string[]>} rule id → sorted, de-duplicated `input.…` paths. An id
 *   emitted by several rule bodies gets the UNION of their reads: the rule as a whole is
 *   decided only when every body could be.
 */
export function ruleInputPathsFromAst(moduleAst) {
  const rules = Array.isArray(moduleAst?.rules) ? moduleAst.rules : [];
  const helpers = helpersOf(rules);
  const out = new Map();
  for (const rule of rules) {
    const id = ruleIdOf(rule);
    if (!id) continue;
    const ctx = { paths: new Set(), helpers, visited: new Set() };
    collect(rule, ctx);
    const merged = new Set([...(out.get(id) ?? []), ...ctx.paths]);
    out.set(id, [...merged].sort());
  }
  return out;
}
