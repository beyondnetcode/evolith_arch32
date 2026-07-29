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

export interface NormalizedRule {
  id: string;
  severity: 'MUST' | 'SHOULD' | 'COULD' | 'MUST NOT';
  category: string;
  title: string;
  description: string;
  blocking: boolean;
  validationQuery?: string;
  sourceFile: string;
  /** Optional enforcer routing (GT-514). Absent ⇒ evaluated by the native engine. */
  enforce?: EnforceDescriptor;
}
