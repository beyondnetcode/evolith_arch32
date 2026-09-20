/**
 * How a rule is enforced by an external analyzer (GT-514 · EAG-08). When
 * `engine === 'enforcer'` the {@link CompositeRuleEvaluator} routes the rule to an
 * {@link IEnforcerAdapter} instead of the native engine.
 *
 * GT-632: this used to be the ROUTING subset only — `config`, `configRef`, `mode`
 * and `severityMap` were parsed by the PolicyCompiler at design time and then
 * dropped on the floor at normalization time. That is why HXA-01/02/04/05 could
 * declare a complete `from`/`to` module-graph clause and still have nothing to
 * evaluate it: by the time a rule reached an evaluator, the clause was gone. The
 * descriptor now carries the whole authored block, so the check a rule declares
 * survives into the engine that has to run it.
 */
export interface EnforceDescriptor {
  /** `'enforcer'` routes to an adapter; anything else stays on the native default. */
  readonly engine: 'native' | 'opa' | 'enforcer';
  /** Enforcer tool that owns this rule (matches an `enforcer-catalog.json` entry). */
  readonly tool: string;
  /** The tool's own rule id, when it differs from the Evolith rule id. */
  readonly toolRuleId?: string;
  /** Runtime ecosystem the analyzer needs (selects the adapter). */
  readonly runtime?: 'node' | 'dotnet' | 'php' | 'python' | 'iac' | 'shell';
  /** Tool-native config fragment, inlined (e.g. a depcruise `from`/`to` clause). */
  readonly config?: Readonly<Record<string, unknown>>;
  /** Reference to an external tool config, when it is not inlined. */
  readonly configRef?: string;
  /** Enforcement strength. Defaults from the rule's `blocking` flag when omitted. */
  readonly mode?: 'warn' | 'block';
  /** Maps a tool's own severity vocabulary onto the canonical violation severity. */
  readonly severityMap?: Readonly<Record<string, string>>;
}

/**
 * GT-678 — the per-rule delta a second party may author over a Core rule.
 *
 * The same shape whether it arrives from a `tenants/**` copy of the rule inside
 * the corpus or from a satellite's `rule-overrides` document: one model, one
 * policy (`applyRuleOverrides`), so the two entry paths cannot drift apart in
 * what they let through. Every field is what the author WROTE — a defaulted
 * value never appears here, because applying a default on top of the Core rule
 * would be a downgrade nobody asked for.
 */
export interface AuthoredRuleOverride {
  readonly enabled?: boolean;
  /** Corpus vocabulary; `SHOULD NOT` collapses to `SHOULD` exactly as the loader does. */
  readonly severity?: string;
  readonly blocking?: boolean;
  readonly rationale?: string;
  readonly approvedBy?: string;
  /** ISO date, inclusive, UTC. */
  readonly expiresOn?: string;
}

/**
 * GT-678 — a `tenants/**` copy's delta, attached to the Core rule it redefines.
 *
 * The loader used to push both copies additively, so a corpus with one tenant
 * pack produced two `ACL-02`s at two severities and the Core one still blocking.
 * Now it keeps the Core copy and hangs the tenant's AUTHORED delta here; the
 * engine applies it under the blocking-criterion policy, with the clock the
 * loader deliberately does not have (a cached corpus must not freeze an expiry).
 */
export interface CorpusRuleOverride {
  /** The tenant pack's `sourceFile`, e.g. `src/rulesets/tenants/acme/pack.rules.json`. */
  readonly source: string;
  readonly delta: AuthoredRuleOverride;
}

/**
 * GT-716 AC2 — where the truth of a declared fact lives. Not how it reaches an
 * engine: an `external` or `supplied` facet under `satellite.*` reaches the OPA
 * engine through `facts.satellite` (GT-694) and never the native one.
 *
 * Ranked, most demanding first — `runtime` > `external` > `supplied` > `observed` —
 * because a rule's native class is that of its most demanding fact.
 */
export type FactProvenance = 'observed' | 'supplied' | 'external' | 'runtime';

/**
 * One fact a rule declares it reads, resolved by the loader against the vocabulary
 * in `src/rulesets/schema/facets.json`. `why` is the vocabulary's own sentence.
 */
export interface DeclaredFact {
  readonly facet: string;
  readonly provenance: FactProvenance;
  readonly why?: string;
}

export interface NormalizedRule {
  id: string;
  severity: 'MUST' | 'SHOULD' | 'COULD' | 'MUST NOT';
  category: string;
  title: string;
  description: string;
  blocking: boolean;
  validationQuery?: string;
  /**
   * GT-716 AC2 — the facts this rule's check reads: the ONE declaration both engines
   * derive from. The native triage class comes from the facets' provenance; the OPA
   * bundle build fails when a policy reads a facet the rule did not declare.
   *
   * `[]` says the rule states no machine-checkable fact (documentation, or a check
   * nobody authored yet). Absent means the pack predates the declaration — a tenant
   * pack, a fixture — and the engine falls back to the pre-GT-716 defaults.
   */
  facts?: readonly DeclaredFact[];
  sourceFile: string;
  /** Optional enforcer routing (GT-514). Absent ⇒ evaluated by the native engine. */
  enforce?: EnforceDescriptor;
  /**
   * GT-678 — `false` when the rule's OWN file declares `enabled: false`. Absent
   * means active. The engine removes such a rule before evaluation and reports
   * it as disabled with its source; it used to be accepted by the schema and
   * discarded by the loader, which is worse than a rejection because it looks
   * like configuration.
   */
  enabled?: boolean;
  /** GT-678 — a tenant pack's delta over this rule, applied by the engine. */
  corpusOverride?: CorpusRuleOverride;
}
