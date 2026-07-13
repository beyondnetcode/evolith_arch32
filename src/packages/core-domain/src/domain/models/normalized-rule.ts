/**
 * How a rule is enforced by an external analyzer (GT-514 · EAG-08). When
 * `engine === 'enforcer'` the {@link CompositeRuleEvaluator} routes the rule to an
 * {@link IEnforcerAdapter} instead of the native engine. The full `enforce:` block
 * (config/severityMap/mode) is authored by GT-516; this is the routing subset.
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
