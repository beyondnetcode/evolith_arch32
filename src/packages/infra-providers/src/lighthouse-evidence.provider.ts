import { createHash } from 'node:crypto';

import {
  normalizeEvidence,
  type Evidence,
  type EvidenceFinding,
  type EvidenceFindingSeverity,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';

/**
 * Lighthouse reference evidence provider (GT-534 · ADR-0111 / companion ADR-0113).
 *
 * The FIRST concrete adapter behind the Quality Signal Provider seam: it runs
 * Google Lighthouse (Apache-2.0) over a deployed URL and emits normalized,
 * `deterministic` canonical {@link Evidence} with mandatory provenance. Lighthouse
 * is the lowest-risk deterministic evidence source — an embeddable Node module
 * with pure JSON output and no lock-in (see ADR-0113 for the vendor/runtime choice).
 *
 * Layering: this adapter lives at the edge (`@beyondnet/evolith-infra-providers`)
 * and imports ONLY the canonical `Evidence` shapes from `core-domain`. It does NOT
 * depend on `@beyondnet/evolith-agent-runtime`: importing the port from the
 * orchestration layer into an infra-edge package would invert the dependency
 * direction (infra → orchestration). Instead the class conforms to the
 * `IQualitySignalProvider` port STRUCTURALLY — the structural contract is mirrored
 * below ({@link IQualitySignalProvider}, {@link CollectionContext},
 * {@link CollectionTarget}), so agent-runtime can register an instance without any
 * package coupling (TypeScript structural typing). Core never executes this adapter
 * (ADR-0111 §1/§3); the runtime collects the `Evidence` and passes it inline.
 */

// ---------------------------------------------------------------------------
// Structural mirror of the agent-runtime `IQualitySignalProvider` port.
// Kept in-package (not imported) to avoid an infra → orchestration dependency;
// see the class docblock. Shapes MUST match agent-runtime's
// `src/domain/ports/quality-signal-provider.port.ts`.
// ---------------------------------------------------------------------------

/** Context describing what the runtime wants collected (drives `supports`). */
export interface CollectionContext {
  /** Opaque tenant the collection runs for (multi-tenant isolation, ADR-0010). */
  readonly tenantId: string;
  /** Quality dimension being sought (e.g. 'performance' | 'a11y' | 'seo'). */
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

/** Structural mirror of the driven port a runtime registers. */
export interface IQualitySignalProvider {
  readonly id: string;
  supports(ctx: CollectionContext): boolean;
  collect(target: CollectionTarget, ctx: CollectionContext): Promise<Evidence>;
}

// ---------------------------------------------------------------------------
// Injected Lighthouse runner — keeps headless Chrome behind a port so the
// adapter is unit-testable with a stubbed LHR (no Chrome required).
// ---------------------------------------------------------------------------

/** A single Lighthouse category as it appears in the LHR JSON (score in 0..1 or null). */
export interface LighthouseCategoryResult {
  readonly id?: string;
  readonly title?: string;
  /** Lighthouse category score, 0..1, or `null` when not computable. */
  readonly score: number | null;
}

/** The subset of the Lighthouse Result (LHR) JSON this adapter consumes. */
export interface LighthouseRunResult {
  readonly lighthouseVersion?: string;
  readonly requestedUrl?: string;
  readonly finalUrl?: string;
  /** ISO-8601 timestamp Lighthouse stamps on the run. */
  readonly fetchTime?: string;
  /** Category id → result. Ids: 'performance' | 'accessibility' | 'best-practices' | 'seo'. */
  readonly categories: Readonly<Record<string, LighthouseCategoryResult>>;
}

/**
 * Injected transport that actually runs Lighthouse. Keeping the headless-Chrome
 * concern behind this port keeps {@link LighthouseEvidenceProvider} pure of
 * process/Chrome I/O so it can be unit-tested with a stubbed LHR. The default
 * implementation ({@link createHeadlessChromeRunner}) launches Chrome and runs
 * the Lighthouse Node module; it is a RUNTIME concern (needs Chrome + a URL).
 */
export interface LighthouseRunner {
  run(url: string, ctx: CollectionContext): Promise<LighthouseRunResult>;
}

export interface LighthouseEvidenceProviderOptions {
  /** Injected runner; default performs a real headless-Chrome run (runtime only). */
  readonly runner?: LighthouseRunner;
  /** Clock for the provenance timestamp fallback (deterministic in tests). */
  readonly now?: () => string;
}

/** Stable registry id for this provider (ADR-0111 §4). */
export const LIGHTHOUSE_PROVIDER_ID = 'lighthouse';

/** Version of THIS adapter (provenance.adapterVersion), independent of Lighthouse's own. */
export const LIGHTHOUSE_ADAPTER_VERSION = '1.0.0';

/** The evidence `source` label the Core sees (opaque to it). */
const EVIDENCE_SOURCE = 'lighthouse';

/**
 * Lighthouse category id → canonical metric/finding key. Anything outside this
 * map (e.g. 'pwa') is ignored so the emitted shape is stable and predictable.
 */
const CATEGORY_KEY: Readonly<Record<string, string>> = {
  performance: 'performance',
  accessibility: 'a11y',
  'best-practices': 'best-practices',
  seo: 'seo',
};

/** Dimensions this provider can serve behind the port. */
const SUPPORTED_DIMENSIONS: ReadonlySet<string> = new Set([
  'performance',
  'a11y',
  'accessibility',
  'seo',
  'best-practices',
  'web-quality',
]);

/**
 * Map a Lighthouse category score (0..1) to an {@link EvidenceFindingSeverity}.
 * Deterministic: same score always yields the same severity. Higher score ⇒ lower
 * severity; a passing category (≥ 0.9) is `info`, a failing one is `critical`.
 */
export function severityForScore(score: number): EvidenceFindingSeverity {
  if (score >= 0.9) return 'info';
  if (score >= 0.75) return 'low';
  if (score >= 0.5) return 'medium';
  if (score >= 0.25) return 'high';
  return 'critical';
}

/**
 * Reference adapter behind the Quality Signal Provider port (ADR-0111).
 * Structurally implements {@link IQualitySignalProvider}.
 */
export class LighthouseEvidenceProvider implements IQualitySignalProvider {
  public readonly id = LIGHTHOUSE_PROVIDER_ID;

  private readonly runner: LighthouseRunner;
  private readonly now: () => string;

  constructor(options: LighthouseEvidenceProviderOptions = {}) {
    this.runner = options.runner ?? createHeadlessChromeRunner();
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /**
   * This provider serves runtime web-quality dimensions. A collection with no
   * declared dimension is served too (a full Lighthouse run covers all of them).
   */
  supports(ctx: CollectionContext): boolean {
    if (ctx.dimension === undefined) return true;
    return SUPPORTED_DIMENSIONS.has(ctx.dimension);
  }

  /**
   * Run Lighthouse over `target.url` and emit ONE normalized, deterministic
   * {@link Evidence}: every mapped category becomes a `0..100` metric AND an
   * {@link EvidenceFinding} whose severity is derived from the category score.
   * Provenance is mandatory and stamped here (collectedBy/adapterVersion/
   * artifactHash/timestamp). Throws when no URL target is supplied — Lighthouse
   * is a runtime auditor and cannot run without a deployed URL.
   */
  async collect(target: CollectionTarget, ctx: CollectionContext): Promise<Evidence> {
    const url = target.url?.trim();
    if (!url) {
      throw new Error('LighthouseEvidenceProvider requires target.url (a deployed URL to audit)');
    }

    const lhr = await this.runner.run(url, ctx);

    const metrics: Record<string, number> = {};
    const findings: EvidenceFinding[] = [];

    for (const [categoryId, key] of Object.entries(CATEGORY_KEY)) {
      const category = lhr.categories?.[categoryId];
      if (!category || category.score === null || category.score === undefined) continue;

      const score01 = category.score;
      const score100 = Math.round(score01 * 100);
      metrics[key] = score100;

      const label = category.title ?? categoryId;
      findings.push({
        code: `lighthouse.${key}`,
        severity: severityForScore(score01),
        message: `${label} score ${score100}/100`,
        location: lhr.finalUrl ?? lhr.requestedUrl ?? url,
      });
    }

    const artifactHash = createHash('sha256')
      .update(JSON.stringify(lhr))
      .digest('hex');

    return normalizeEvidence(
      {
        source: EVIDENCE_SOURCE,
        dimension: ctx.dimension ?? 'web-quality',
        metrics,
        findings,
        determinism: 'deterministic',
        provenance: {
          collectedBy: LIGHTHOUSE_PROVIDER_ID,
          adapterVersion: LIGHTHOUSE_ADAPTER_VERSION,
          artifactHash,
          timestamp: lhr.fetchTime,
        },
      },
      { now: this.now },
    );
  }
}

/**
 * Default {@link LighthouseRunner}: launches headless Chrome and runs the
 * Lighthouse Node module. Lazily/dynamically imports `lighthouse` and
 * `chrome-launcher` so NEITHER is a build- or install-time dependency of this
 * package (ADR-0111 §5 — no external tool is ever a hard dependency). This path
 * is a RUNTIME concern: it needs a real headless Chrome and a deployed URL, so
 * it is never exercised by unit tests (which inject a stub runner instead).
 */
export function createHeadlessChromeRunner(): LighthouseRunner {
  // Variable-indirected dynamic import so TypeScript does not statically resolve
  // (and require the types of) the optional, not-installed vendor modules.
  const optionalImport = (moduleName: string): Promise<unknown> => import(moduleName);

  return {
    async run(url: string): Promise<LighthouseRunResult> {
      let chromeLauncher: any;
      let lighthouse: any;
      try {
        chromeLauncher = await optionalImport('chrome-launcher');
        lighthouse = await optionalImport('lighthouse');
      } catch (cause) {
        throw new Error(
          "LighthouseEvidenceProvider default runner needs 'lighthouse' and 'chrome-launcher' " +
            'installed plus a headless Chrome available at runtime. Install them in the runtime ' +
            'image, or inject a custom LighthouseRunner. ' +
            `(underlying: ${cause instanceof Error ? cause.message : String(cause)})`,
        );
      }

      const runLighthouse = lighthouse.default ?? lighthouse;
      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
      try {
        const result = await runLighthouse(url, { port: chrome.port, output: 'json' });
        return result.lhr as LighthouseRunResult;
      } finally {
        await chrome.kill();
      }
    },
  };
}
