/**
 * Compliance-control mapping (GT-525 · axis 2 — positioning §12 P1 wedge).
 *
 * Ties an architecture {@link Violation} to a NAMED compliance control (SOC2 / ISO 27001 /
 * EU AI Act) — the highest-ACV wedge for the CISO/compliance buyer, and what turns a
 * technical finding into sellable audit evidence. Cross-cutting: it works on any Violation
 * regardless of language or tool, keyed by the rule's ADR ref first, then its rule id.
 *
 * Design invariants:
 *  - The control CATALOG is versioned and DECOUPLED from rule code (a mis-mapping is a data
 *    change, not a code change); {@link resolveComplianceControlIds} maps refs → control ids.
 *  - `complianceControls` is DERIVED enrichment metadata on a Violation (like `owner`) — it is
 *    NOT part of the fingerprint identity (see `violation.ts`), so enrichment never churns it.
 *  - An unknown control id maps to nothing (fail-open on lookup, never fabricates a control).
 */

import type { Violation } from './violation';

/** Compliance frameworks a control can belong to. */
export type ComplianceFramework = 'SOC2' | 'ISO27001' | 'EU-AI-Act';

/** One named control in a framework, e.g. `SOC2-CC8.1`. */
export interface ComplianceControl {
  /** Stable control id, e.g. `SOC2-CC8.1`, `ISO27001-A.14.2.5`, `EU-AI-Act-Art.15`. */
  readonly id: string;
  readonly framework: ComplianceFramework;
  /** Short human title of the control. */
  readonly title: string;
}

/** A versioned catalog of the controls Evolith can attribute violations to. */
export interface ComplianceControlCatalog {
  readonly version: string;
  readonly controls: readonly ComplianceControl[];
}

/**
 * Declarative rule/ADR → control-id[] mapping. `byRuleId` augments `byAdr` (both apply, the
 * union is emitted). Decoupled from rule code so a control re-attribution is a data edit.
 */
export interface ComplianceMapping {
  readonly version: string;
  /** ADR ref (e.g. `ADR-0002`) → control ids. */
  readonly byAdr?: Readonly<Record<string, readonly string[]>>;
  /** Rule id (e.g. `HXA-01`) → control ids. */
  readonly byRuleId?: Readonly<Record<string, readonly string[]>>;
}

/** Default control catalog — seed of the frameworks Evolith attributes architecture rules to. */
export const DEFAULT_COMPLIANCE_CATALOG: ComplianceControlCatalog = {
  version: '1.0.0',
  controls: [
    { id: 'SOC2-CC8.1', framework: 'SOC2', title: 'Change management — authorized, tested changes' },
    { id: 'ISO27001-A.14.2.5', framework: 'ISO27001', title: 'Secure system engineering principles' },
    { id: 'ISO27001-A.14.2.1', framework: 'ISO27001', title: 'Secure development policy' },
    { id: 'EU-AI-Act-Art.15', framework: 'EU-AI-Act', title: 'Accuracy, robustness and cybersecurity' },
  ],
};

/** Default mapping — architecture-boundary rules (ADR-0002) discharge secure-engineering controls. */
export const DEFAULT_COMPLIANCE_MAPPING: ComplianceMapping = {
  version: '1.0.0',
  byAdr: {
    'ADR-0002': ['ISO27001-A.14.2.5', 'SOC2-CC8.1'],
  },
};

/** Resolve the (sorted, de-duplicated) control ids a violation ref discharges. */
export function resolveComplianceControlIds(
  ref: { readonly adrRef?: string; readonly ruleId?: string },
  mapping: ComplianceMapping = DEFAULT_COMPLIANCE_MAPPING,
): string[] {
  const ids = new Set<string>();
  if (ref.adrRef) for (const id of mapping.byAdr?.[ref.adrRef] ?? []) ids.add(id);
  if (ref.ruleId) for (const id of mapping.byRuleId?.[ref.ruleId] ?? []) ids.add(id);
  return [...ids].sort();
}

/** Look up full {@link ComplianceControl}s for ids against the catalog; unknown ids are dropped. */
export function lookupControls(
  ids: readonly string[],
  catalog: ComplianceControlCatalog = DEFAULT_COMPLIANCE_CATALOG,
): ComplianceControl[] {
  const byId = new Map(catalog.controls.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is ComplianceControl => c !== undefined);
}

/**
 * Enrich each violation with its resolved `complianceControls` (leaving those with no mapped
 * control untouched). Returns new objects — never mutates the inputs.
 */
export function enrichViolationsWithCompliance(
  violations: readonly Violation[],
  mapping: ComplianceMapping = DEFAULT_COMPLIANCE_MAPPING,
): Violation[] {
  return violations.map((v) => {
    const controls = resolveComplianceControlIds({ adrRef: v.adrRef, ruleId: v.ruleId }, mapping);
    return controls.length > 0 ? { ...v, complianceControls: controls } : v;
  });
}
