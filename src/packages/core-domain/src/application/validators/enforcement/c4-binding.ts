/**
 * C4 element ↔ code MODULE correspondence (GT-590 · axis 2 — positioning §13.2).
 *
 * `structurizr-parser.ts` lifts the INTENDED architecture out of a `.dsl`, and `c4-compiler.ts`
 * turns a code-mapped {@link C4Model} into executable {@link EditBoundaryRule}s. The step nobody
 * owned is the one in between: **deciding which directory of real code an element IS**. Until that
 * decision exists the compiler is unreachable — every element arrives with `path` undefined, so
 * {@link compileC4ToBoundaryRules} skips it and the model yields zero rules. Intent and
 * implementation sit side by side and cannot be compared.
 *
 * This module makes that decision an asset with a lifecycle:
 *
 *   1. PROPOSE — {@link proposeC4Bindings} scores every (element, module-prefix) pair against the
 *      structural fact base (GT-589 `RepoFacts`, produced OUTSIDE the Core) and emits candidates
 *      with a CONFIDENCE. A proposal is a guess: `determinism: 'probabilistic'`, and under GT-584
 *      an unmeasured guess is INADMISSIBLE FOR BLOCKING. Nothing here compiles a rule.
 *   2. CONFIRM — a human confirms a candidate at a HITL gate (`IApprovalPort`, GT-608). The
 *      confirmation is recorded by {@link confirmC4Binding}, which mints a NEW VERSION of the
 *      {@link C4BindingMap}: monotone `version`, content hash over a canonical form, and a
 *      `supersedes` link to the hash it replaced. History is append-only by construction — a map
 *      is never mutated, only superseded.
 *   3. REPLAY — {@link applyC4BindingMap} writes the confirmed prefixes onto a {@link C4Model} as
 *      `path` / `importPrefix`. From that point the model is a DETERMINISTIC input: the same map
 *      and the same model produce byte-identical boundary rules, on every later evaluation, with
 *      no scorer in the loop.
 *
 * Granularity is deliberately MODULE/PATH, not symbol. `RepoFacts.modules` identifies a module by
 * its repo-relative POSIX path, which is exactly what `EditBoundaryRule.appliesTo` consumes.
 * Symbol-level binding (an element bound to `Foo#bar`) is a different asset with a different
 * consumer (`SymbolBoundaryRule`) and is NOT modelled here.
 *
 * Layering: PURE and side-effect free — facts in, decisions out. It never reads a repository, never
 * runs an indexer and never persists (ADR-0101); the `RepoFacts` it scores against arrive inline
 * and the confirmed map is handed back to the caller to store. `RepoFacts` is imported TYPE-ONLY,
 * so `application/` gains no runtime edge to `evaluation/`.
 */

import { createHash } from 'node:crypto';
import type { ModuleFact, RepoFacts } from '../../../evaluation/contracts/repo-facts';
import { compileC4ToBoundaryRules, type C4CompileOptions, type C4Element, type C4Model } from './c4-compiler';
import type { EditBoundaryRule } from './edit-gate';

/** Schema version of the proposal/confirmation shapes below. */
export const C4_BINDING_SCHEMA_VERSION = '1.0.0';

/** Digest algorithm for {@link computeC4BindingMapHash}; the hash is prefixed with it. */
export const C4_BINDING_HASH_ALGORITHM = 'sha256';

/**
 * Why a candidate scored. Each signal is independent evidence for the same claim, so confidences
 * combine by noisy-OR (below) rather than by summing — three weak signals should not out-rank one
 * strong one by arithmetic accident.
 */
export type C4BindingSignalKind =
  /** The element already declares this exact `path` in the diagram source. */
  | 'declared-path'
  /** The element already declares an `importPrefix` covering this prefix. */
  | 'declared-import'
  /** The prefix's last segment equals a normalized token of the element's name/id. */
  | 'name-match'
  /** Some interior segment of the prefix equals a normalized token. */
  | 'segment-match'
  /** Every module under the prefix carries a `layer` equal to a normalized token. */
  | 'layer-match';

export interface C4BindingSignal {
  readonly kind: C4BindingSignalKind;
  /** Independent probability this signal alone is right, in (0,1). */
  readonly weight: number;
  readonly detail: string;
}

/** One proposed correspondence: element ↔ a repo-relative directory prefix. */
export interface C4BindingCandidate {
  readonly elementId: string;
  /** Repo-relative POSIX directory prefix (no trailing slash), e.g. `src/domain`. */
  readonly modulePrefix: string;
  /** How many modules of the fact base live under the prefix. */
  readonly moduleCount: number;
  /** Combined confidence in [0,1). Never 1 — a proposal is never a certainty. */
  readonly confidence: number;
  readonly signals: readonly C4BindingSignal[];
}

export interface C4BindingProposal {
  readonly elementId: string;
  readonly elementName: string;
  /** Candidates, best first; ties broken by `modulePrefix` so the order is total and stable. */
  readonly candidates: readonly C4BindingCandidate[];
}

/**
 * The full output of a scoring run. `determinism` is fixed `'probabilistic'` and is part of the
 * shape rather than a caller's choice: a scorer cannot relabel its own guesses as measurements.
 */
export interface C4BindingProposalSet {
  readonly schemaVersion: string;
  readonly determinism: 'probabilistic';
  /** `RepoFacts.contentHash` the proposals were scored against — the provenance link. */
  readonly factsContentHash: string;
  readonly proposals: readonly C4BindingProposal[];
}

/** A correspondence a NAMED human confirmed. This is the governed asset. */
export interface ConfirmedC4Binding {
  readonly elementId: string;
  readonly modulePrefix: string;
  /** Import specifier prefix identifying an import OF this element (defaults to `modulePrefix`). */
  readonly importPrefix: string;
  /** The human who confirmed. Never synthesized — see {@link confirmC4Binding}. */
  readonly confirmedBy: string;
  /** ISO-8601 instant of confirmation. */
  readonly confirmedAt: string;
  /** Id of the HITL approval record that carried the decision, when the gate returned one. */
  readonly approvalId?: string;
  /** The confidence the proposal carried when the human saw it — what they overrode or endorsed. */
  readonly proposedConfidence: number;
}

/**
 * An immutable version of the confirmed correspondence. `contentHash` covers the canonical form of
 * everything a later evaluation reads, so two hosts holding the same hash hold the same map.
 */
export interface C4BindingMap {
  readonly schemaVersion: string;
  /** Monotone from 0 (empty). Every confirmation mints the next one. */
  readonly version: number;
  readonly contentHash: string;
  /** `RepoFacts.contentHash` this map's prefixes were confirmed against. */
  readonly factsContentHash: string;
  /** Confirmed bindings, sorted by `elementId` — one binding per element. */
  readonly bindings: readonly ConfirmedC4Binding[];
  /** `contentHash` of the version this one replaces; absent on version 0. */
  readonly supersedes?: string;
}

export interface ProposeC4BindingsOptions {
  /** Drop candidates below this confidence (default 0.2). */
  readonly minConfidence?: number;
  /** Keep at most this many candidates per element (default 3). */
  readonly maxCandidatesPerElement?: number;
  /** Ignore prefixes covering fewer modules than this (default 1). */
  readonly minModuleCount?: number;
  /** Maximum directory depth to consider, counting segments (default 4). */
  readonly maxDepth?: number;
}

/** Independent per-signal weights. Deliberately below 1 — no single signal is proof. */
const SIGNAL_WEIGHT: Readonly<Record<C4BindingSignalKind, number>> = {
  'declared-path': 0.8,
  'declared-import': 0.55,
  'name-match': 0.5,
  'segment-match': 0.2,
  'layer-match': 0.45,
};

const DEFAULTS: Required<ProposeC4BindingsOptions> = {
  minConfidence: 0.2,
  maxCandidatesPerElement: 3,
  minModuleCount: 1,
  maxDepth: 4,
};

/** Lowercase, strip non-alphanumerics — `Domain Layer` and `domain-layer` normalize alike. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** The distinct normalized tokens an element can be recognized by (its name and its id). */
function tokensOf(element: C4Element): string[] {
  const out = new Set<string>();
  for (const raw of [element.name, element.id]) {
    const whole = normalize(raw);
    if (whole) out.add(whole);
    for (const part of raw.split(/[^A-Za-z0-9]+/)) {
      const token = normalize(part);
      if (token.length >= 3) out.add(token);
    }
  }
  return [...out].sort();
}

/** Trim a path to POSIX form without leading/trailing slashes. */
function normalizePrefix(prefix: string): string {
  return prefix.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Every directory prefix of the fact base, with the number of modules underneath. A module id is a
 * repo-relative file path, so its ancestors ARE the candidate module boundaries. Files at the repo
 * root contribute no prefix.
 */
export function modulePrefixes(
  modules: readonly ModuleFact[],
  maxDepth: number,
): Map<string, { moduleCount: number; layers: Set<string> }> {
  const out = new Map<string, { moduleCount: number; layers: Set<string> }>();
  for (const module of modules) {
    const segments = normalizePrefix(module.id).split('/');
    // Drop the filename: a prefix is a directory.
    segments.pop();
    for (let depth = 1; depth <= Math.min(segments.length, maxDepth); depth++) {
      const prefix = segments.slice(0, depth).join('/');
      if (!prefix) continue;
      let entry = out.get(prefix);
      if (!entry) out.set(prefix, (entry = { moduleCount: 0, layers: new Set<string>() }));
      entry.moduleCount += 1;
      entry.layers.add(module.layer === undefined ? '' : normalize(module.layer));
    }
  }
  return out;
}

/**
 * Noisy-OR: `1 - Π(1 - wᵢ)`. Monotone in every signal, bounded strictly below 1, and unchanged by
 * the order signals were collected in — so the score is deterministic given the inputs.
 */
function combine(signals: readonly C4BindingSignal[]): number {
  let miss = 1;
  for (const signal of signals) miss *= 1 - signal.weight;
  // Round to 4 dp so the number survives a JSON round-trip identically on every host.
  return Math.round((1 - miss) * 10_000) / 10_000;
}

function scoreCandidate(
  element: C4Element,
  tokens: readonly string[],
  prefix: string,
  entry: { moduleCount: number; layers: Set<string> },
): C4BindingSignal[] {
  const signals: C4BindingSignal[] = [];
  const segments = prefix.split('/');
  const last = normalize(segments[segments.length - 1]);

  if (element.path !== undefined && normalizePrefix(element.path) === prefix) {
    signals.push({
      kind: 'declared-path',
      weight: SIGNAL_WEIGHT['declared-path'],
      detail: `the diagram source already declares path=${prefix}`,
    });
  }
  if (element.importPrefix !== undefined && prefix.startsWith(normalizePrefix(element.importPrefix))) {
    signals.push({
      kind: 'declared-import',
      weight: SIGNAL_WEIGHT['declared-import'],
      detail: `covered by the declared import prefix '${element.importPrefix}'`,
    });
  }
  if (tokens.includes(last)) {
    signals.push({
      kind: 'name-match',
      weight: SIGNAL_WEIGHT['name-match'],
      detail: `the prefix's last segment '${segments[segments.length - 1]}' matches the element name`,
    });
  } else {
    const interior = segments.slice(0, -1).map(normalize).find((s) => tokens.includes(s));
    if (interior !== undefined) {
      signals.push({
        kind: 'segment-match',
        weight: SIGNAL_WEIGHT['segment-match'],
        detail: `an interior path segment matches the element name`,
      });
    }
  }
  // A layer signal only counts when EVERY module under the prefix agrees — a mixed
  // directory is evidence against a clean boundary, not for one.
  if (entry.layers.size === 1) {
    const [layer] = [...entry.layers];
    if (layer && tokens.includes(layer)) {
      signals.push({
        kind: 'layer-match',
        weight: SIGNAL_WEIGHT['layer-match'],
        detail: `all ${entry.moduleCount} modules under the prefix declare layer '${layer}'`,
      });
    }
  }
  return signals;
}

/**
 * Score element ↔ module-prefix correspondences against a structural fact base.
 *
 * PURE and total: same `(model, facts, options)` ⇒ same output, including ordering. The result is
 * a set of GUESSES — it is not a {@link C4BindingMap} and cannot be applied to a model. Only
 * {@link confirmC4Binding} turns a candidate into something {@link applyC4BindingMap} will read.
 */
export function proposeC4Bindings(
  model: C4Model,
  facts: RepoFacts,
  options: ProposeC4BindingsOptions = {},
): C4BindingProposalSet {
  const opts = { ...DEFAULTS, ...options };
  const prefixes = modulePrefixes(facts.modules, opts.maxDepth);

  const proposals: C4BindingProposal[] = [];
  for (const element of [...model.elements].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const tokens = tokensOf(element);
    const candidates: C4BindingCandidate[] = [];

    for (const [prefix, entry] of prefixes) {
      if (entry.moduleCount < opts.minModuleCount) continue;
      const signals = scoreCandidate(element, tokens, prefix, entry);
      if (signals.length === 0) continue;
      const confidence = combine(signals);
      if (confidence < opts.minConfidence) continue;
      candidates.push({
        elementId: element.id,
        modulePrefix: prefix,
        moduleCount: entry.moduleCount,
        confidence,
        signals,
      });
    }

    candidates.sort((a, b) =>
      b.confidence !== a.confidence
        ? b.confidence - a.confidence
        : a.modulePrefix < b.modulePrefix
          ? -1
          : a.modulePrefix > b.modulePrefix
            ? 1
            : 0,
    );
    proposals.push({
      elementId: element.id,
      elementName: element.name,
      candidates: candidates.slice(0, opts.maxCandidatesPerElement),
    });
  }

  return {
    schemaVersion: C4_BINDING_SCHEMA_VERSION,
    determinism: 'probabilistic',
    factsContentHash: facts.contentHash,
    proposals,
  };
}

/**
 * Canonical serialization of everything a later evaluation reads off a map. Positional tuples, so
 * key order can never change the digest; `contentHash` and `supersedes` are excluded (a hash cannot
 * cover itself, and the link to the previous version is bookkeeping, not content).
 */
export function canonicalizeC4BindingMap(map: C4BindingMap): string {
  return JSON.stringify([
    map.schemaVersion,
    map.version,
    map.factsContentHash,
    [...map.bindings]
      .sort((a, b) => (a.elementId < b.elementId ? -1 : a.elementId > b.elementId ? 1 : 0))
      .map((b) => [
        b.elementId,
        b.modulePrefix,
        b.importPrefix,
        b.confirmedBy,
        b.confirmedAt,
        b.approvalId ?? null,
        b.proposedConfidence,
      ]),
  ]);
}

export function computeC4BindingMapHash(map: C4BindingMap): string {
  const digest = createHash(C4_BINDING_HASH_ALGORITHM)
    .update(canonicalizeC4BindingMap(map), 'utf8')
    .digest('hex');
  return `${C4_BINDING_HASH_ALGORITHM}:${digest}`;
}

/** The version-0 map for a fact base: nothing confirmed, therefore nothing enforceable. */
export function emptyC4BindingMap(factsContentHash: string): C4BindingMap {
  const draft: C4BindingMap = {
    schemaVersion: C4_BINDING_SCHEMA_VERSION,
    version: 0,
    contentHash: '',
    factsContentHash,
    bindings: [],
  };
  return { ...draft, contentHash: computeC4BindingMapHash(draft) };
}

/** Raised when a confirmation would produce a map a later evaluation could not trust. */
export class C4BindingConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'C4BindingConfirmationError';
  }
}

export interface ConfirmC4BindingInput {
  readonly elementId: string;
  readonly modulePrefix: string;
  readonly importPrefix?: string;
  readonly confirmedBy: string;
  readonly confirmedAt: string;
  readonly approvalId?: string;
  readonly proposedConfidence: number;
}

/**
 * Record one human confirmation, returning the NEXT version of the map. The input map is never
 * mutated — the caller holds both versions and can replay either.
 *
 * Fail-closed on the two ways a confirmation could be a fiction:
 *  - an unnamed `confirmedBy` is refused outright (the Core does not invent an accountable human);
 *  - a confirmation against a different fact base than the map was built on is refused, because the
 *    prefix the human saw may no longer exist.
 *
 * Re-confirming an element REPLACES its binding rather than duplicating it: a map holds at most one
 * correspondence per element, which is what makes replay deterministic.
 */
export function confirmC4Binding(
  map: C4BindingMap,
  input: ConfirmC4BindingInput,
  factsContentHash: string = map.factsContentHash,
): C4BindingMap {
  const confirmedBy = input.confirmedBy?.trim();
  if (!confirmedBy) {
    throw new C4BindingConfirmationError(
      `Refusing to confirm binding for element '${input.elementId}': no named approver. ` +
        'A confirmed correspondence is only worth more than a guess because a human is accountable for it.',
    );
  }
  if (factsContentHash !== map.factsContentHash) {
    throw new C4BindingConfirmationError(
      `Refusing to confirm binding for element '${input.elementId}': the map was built against ` +
        `facts '${map.factsContentHash}' but the confirmation cites '${factsContentHash}'.`,
    );
  }
  const modulePrefix = normalizePrefix(input.modulePrefix);
  if (!modulePrefix) {
    throw new C4BindingConfirmationError(
      `Refusing to confirm binding for element '${input.elementId}': empty module prefix.`,
    );
  }

  const binding: ConfirmedC4Binding = {
    elementId: input.elementId,
    modulePrefix,
    importPrefix: normalizePrefix(input.importPrefix ?? modulePrefix),
    confirmedBy,
    confirmedAt: input.confirmedAt,
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    proposedConfidence: input.proposedConfidence,
  };

  const bindings = [...map.bindings.filter((b) => b.elementId !== binding.elementId), binding].sort(
    (a, b) => (a.elementId < b.elementId ? -1 : a.elementId > b.elementId ? 1 : 0),
  );

  const draft: C4BindingMap = {
    schemaVersion: C4_BINDING_SCHEMA_VERSION,
    version: map.version + 1,
    contentHash: '',
    factsContentHash: map.factsContentHash,
    bindings,
    supersedes: map.contentHash,
  };
  return { ...draft, contentHash: computeC4BindingMapHash(draft) };
}

/**
 * Project a confirmed map onto a {@link C4Model}: every element with a confirmed binding gains the
 * `path` / `importPrefix` that {@link compileC4ToBoundaryRules} needs, and every element without one
 * is left exactly as it was — an unconfirmed element yields no rule, which is the GT-584 posture
 * expressed structurally rather than by a flag.
 *
 * The confirmed value WINS over whatever the diagram source declared: the human's decision is the
 * governed asset, the tag in the `.dsl` is an authoring hint.
 */
export function applyC4BindingMap(model: C4Model, map: C4BindingMap): C4Model {
  const byElement = new Map(map.bindings.map((b) => [b.elementId, b]));
  return {
    elements: model.elements.map((element) => {
      const binding = byElement.get(element.id);
      if (!binding) return element;
      return { ...element, path: binding.modulePrefix, importPrefix: binding.importPrefix };
    }),
    relationships: model.relationships,
  };
}

/**
 * The whole replay path in one call: confirmed map → bound model → executable boundary rules.
 *
 * `compileC4ToBoundaryRules` shipped with no producer — nothing outside its own unit test ever
 * handed it a code-mapped model, because nothing produced one. This is that producer, and it is
 * deliberately the ONLY way the rules are reached from a map: a caller cannot accidentally compile
 * from proposals, because proposals are not a {@link C4BindingMap} and there is no overload that
 * takes them.
 */
export function compileConfirmedC4Bindings(
  model: C4Model,
  map: C4BindingMap,
  options: C4CompileOptions = {},
): EditBoundaryRule[] {
  return compileC4ToBoundaryRules(applyC4BindingMap(model, map), options);
}

/**
 * Serialize the confirmed correspondence into the boundary-rules envelope the edit-time gate
 * already loads (`{ boundaryRules: [...] }`, read by the CLI's `loadBoundaryRules`).
 *
 * This is the last link: the CLI's loader documented `compileC4ToBoundaryRules` as its upstream
 * producer and no such producer existed, so the edit hook could only ever be fed rules written by
 * hand. Now a human's confirmed bindings become that file, and the provenance of the file — which
 * map version, which tree, which schema — travels with it so a reviewer can tell a generated
 * ruleset from an edited one.
 */
export function serializeConfirmedBoundaryRules(
  model: C4Model,
  map: C4BindingMap,
  options: C4CompileOptions = {},
): string {
  return `${JSON.stringify(
    {
      $schema: 'evolith://edit-boundary-rules/1.0.0',
      generatedFrom: {
        producer: 'c4-binding',
        schemaVersion: map.schemaVersion,
        bindingMapVersion: map.version,
        bindingMapContentHash: map.contentHash,
        factsContentHash: map.factsContentHash,
        unboundElements: unboundC4Elements(model, map),
      },
      boundaryRules: compileConfirmedC4Bindings(model, map, options),
    },
    null,
    2,
  )}\n`;
}

/** Every element the model declares that no human has bound yet — the open governance debt. */
export function unboundC4Elements(model: C4Model, map: C4BindingMap): readonly string[] {
  const bound = new Set(map.bindings.map((b) => b.elementId));
  return model.elements
    .filter((e) => !bound.has(e.id))
    .map((e) => e.id)
    .sort();
}
