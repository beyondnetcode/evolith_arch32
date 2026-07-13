/**
 * IQualitySignalProvider — the driven port through which any external
 * quality/evidence tool feeds Evolith Core (ADR-0111 / GT-533).
 *
 * Owned by the ORCHESTRATION layer (agent-runtime), NEVER by core-domain: all
 * provider I/O — headless Chrome (Lighthouse), cloud calls (TestSprite), LLM
 * audits, structural-review rubrics — happens behind this port. The runtime runs
 * the *active* providers, collects normalized {@link Evidence}, and passes it
 * INLINE to the Core via `EvaluationContext.qualitySignals`. The Core evaluates
 * the received `Evidence[]`; it never executes a provider (ADR-0111 §1/§3).
 *
 * The canonical {@link Evidence} shape is the ONLY thing shared with the Core —
 * exactly like source files enter via the `OverlayFileSystem` precedent
 * (ADR-0080). This generalizes the GT-530 `ObservabilityEvidence` adapter into a
 * uniform, tenant-selectable seam for ANY evidence producer.
 */

import type { Evidence } from '@beyondnet/evolith-core-domain/evaluation/contracts';

/** Context describing what the runtime wants collected (drives `supports`). */
export interface CollectionContext {
  /** Opaque tenant the collection runs for (multi-tenant isolation, ADR-0010). */
  readonly tenantId: string;
  /** Quality dimension being sought (e.g. 'performance' | 'a11y' | 'testing'). */
  readonly dimension?: string;
  /** Free-form, provider-interpreted hints (never reach the Core). */
  readonly hints?: Readonly<Record<string, unknown>>;
}

/** What a provider should audit — a runtime target, not source the Core stores. */
export interface CollectionTarget {
  /** Deployed URL for runtime auditors (Lighthouse/TestSprite). */
  readonly url?: string;
  /** Repository/commit reference for structural auditors. */
  readonly repositoryRef?: string;
  /** Provider-specific configuration from the tenant registry entry. */
  readonly config?: Readonly<Record<string, unknown>>;
}

/**
 * A single external evidence producer. Concrete adapters live at the edge
 * (`@evolith/infra-providers`) and are lazily imported so nothing is a hard
 * dependency of the suite (ADR-0111 §5).
 */
export interface IQualitySignalProvider {
  /** Stable provider id — the registry key (e.g. 'lighthouse'). */
  readonly id: string;
  /** Whether this provider can serve the requested collection context. */
  supports(ctx: CollectionContext): boolean;
  /** Run the provider and emit normalized, provenance-stamped canonical Evidence. */
  collect(target: CollectionTarget, ctx: CollectionContext): Promise<Evidence>;
}

export type { Evidence };
