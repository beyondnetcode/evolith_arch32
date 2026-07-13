/**
 * TenantQualitySignalRegistry — declarative, per-tenant selection of quality
 * signal providers (ADR-0111 §4 / GT-533).
 *
 * Providers are registered once (their code lives at the edge behind
 * {@link IQualitySignalProvider}); each tenant declares — in configuration, not
 * in code — which of them are ACTIVE. Selection is opt-in: a provider absent from
 * the tenant config, or present with `enabled: false`, does not run. Cloud /
 * proprietary providers default to disabled and must be opted in explicitly.
 *
 * The registry runs the active providers and returns normalized canonical
 * {@link Evidence}, which the runtime passes INLINE to the Core via
 * `EvaluationContext.qualitySignals`. Collection is a side-effectful ORCHESTRATION
 * concern — the Core never touches this class (ADR-0111 §1/§3).
 */

import {
  normalizeEvidence,
  type Evidence,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type {
  CollectionContext,
  CollectionTarget,
  IQualitySignalProvider,
} from '../domain/ports/quality-signal-provider.port';

/** One provider's declarative opt-in entry in a tenant's config. */
export interface QualitySignalProviderConfig {
  readonly id: string;
  readonly enabled: boolean;
  /** Provider-specific config forwarded into {@link CollectionTarget.config}. */
  readonly config?: Readonly<Record<string, unknown>>;
}

/** A tenant's declarative quality-signal configuration (the registry SSOT). */
export interface TenantQualitySignalConfig {
  readonly tenantId: string;
  readonly providers: readonly QualitySignalProviderConfig[];
}

/** Outcome of one provider's collection attempt (kept for auditability). */
export interface ProviderCollectionOutcome {
  readonly providerId: string;
  readonly ok: boolean;
  readonly evidence?: Evidence;
  readonly error?: string;
}

export class TenantQualitySignalRegistry {
  private readonly providers = new Map<string, IQualitySignalProvider>();

  /** Register a provider adapter. Last registration for an id wins. */
  register(provider: IQualitySignalProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  /** Whether a provider id is registered (its code is available). */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Resolve the providers ACTIVE for a tenant: entries with `enabled: true` whose
   * id is registered. Disabled or unknown ids are silently skipped (opt-in).
   */
  activeProviders(config: TenantQualitySignalConfig): IQualitySignalProvider[] {
    return config.providers
      .filter((p) => p.enabled)
      .map((p) => this.providers.get(p.id))
      .filter((p): p is IQualitySignalProvider => p !== undefined);
  }

  /**
   * Run every active provider that `supports` the context and collect normalized
   * canonical Evidence. A provider that throws is isolated: its failure is
   * captured as an outcome and never aborts the batch (a missing dimension will
   * surface downstream as `no-evidence`, per ADR-0111 §3).
   */
  async collect(
    config: TenantQualitySignalConfig,
    target: CollectionTarget,
    ctx: CollectionContext,
  ): Promise<{ evidence: Evidence[]; outcomes: ProviderCollectionOutcome[] }> {
    const outcomes: ProviderCollectionOutcome[] = [];
    const evidence: Evidence[] = [];

    for (const provider of this.activeProviders(config)) {
      if (!provider.supports(ctx)) continue;

      const entry = config.providers.find((p) => p.id === provider.id);
      const collectionTarget: CollectionTarget = { ...target, config: entry?.config ?? target.config };

      try {
        const raw = await provider.collect(collectionTarget, ctx);
        // Re-normalize through the canonical ACL so provenance is always enforced,
        // even if an adapter returns a loosely-shaped object.
        const normalized = normalizeEvidence(raw);
        evidence.push(normalized);
        outcomes.push({ providerId: provider.id, ok: true, evidence: normalized });
      } catch (err) {
        outcomes.push({
          providerId: provider.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { evidence, outcomes };
  }
}
