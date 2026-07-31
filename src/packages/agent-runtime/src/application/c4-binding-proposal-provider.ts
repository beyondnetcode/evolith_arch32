/**
 * C4BindingProposalProvider — proposes C4 element ↔ code module bindings, with a confidence per
 * binding, through the ADR-0111 quality-signal seam (GT-590 AC1).
 *
 * Why this seam and not a bespoke one: a proposed binding is *exactly* the thing ADR-0111 exists to
 * carry — an external producer's opinion, attributed and provenance-stamped, that the Core did not
 * compute for itself. Reusing it means the confidence a proposal carries is subject to GT-584's
 * admissibility rules rather than to a parallel notion of confidence invented here. The evidence
 * this provider emits declares `determinism: 'probabilistic'` and carries NO `calibration` block,
 * so `admitEvidenceBlocking` classifies it `advisory-uncalibrated` and it CANNOT block. That is the
 * design, not a limitation: a scorer that could block on its own guesses would make the HITL gate
 * decorative.
 *
 * The provider is a pure function of what it is handed. It never opens a repository and never runs
 * an indexer (ADR-0101): the intended model (`.dsl` text or an already-normalized `C4Model`) and the
 * structural fact base (GT-589 `RepoFacts`) both arrive INLINE on `CollectionTarget.config`, exactly
 * as `repoFacts` arrives inline on an `EvaluationContext`.
 *
 * It is also the first non-test PRODUCER for `compileC4ToBoundaryRules`/`parseStructurizrDsl`. Those
 * two shipped with a closed loop — the compiler could turn a code-mapped model into rules, but
 * nothing anywhere produced a code-mapped model, so the loop only closed inside their own unit
 * tests. The path from `.dsl` text to a scored binding starts here.
 */

import {
  proposeC4Bindings,
  type C4BindingProposalSet,
  type ProposeC4BindingsOptions,
} from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-binding';
import type { C4Model } from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-compiler';
import { parseStructurizrDsl } from '@beyondnet/evolith-core-domain/application/validators/enforcement/structurizr-parser';
import type { RepoFacts } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import { normalizeEvidence } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import { createHash } from 'node:crypto';
import type { Evidence } from '../domain/ports/quality-signal-provider.port';
import type {
  CollectionContext,
  CollectionTarget,
  IQualitySignalProvider,
} from '../domain/ports/quality-signal-provider.port';

export const C4_BINDING_PROVIDER_ID = 'c4-binding';
export const C4_BINDING_DIMENSION = 'architecture-binding';
const ADAPTER_VERSION = '1.0.0';

/** Dimensions this provider serves. `architecture` is accepted as the broader ask. */
const SUPPORTED_DIMENSIONS = new Set([C4_BINDING_DIMENSION, 'architecture']);

/** What the caller must place on `CollectionTarget.config` for the provider to have anything to do. */
export interface C4BindingCollectionConfig {
  /** Raw Structurizr `.dsl` text. Ignored when `model` is supplied. */
  readonly dsl?: string;
  /** An already-normalized model, for a caller that parsed elsewhere. */
  readonly model?: C4Model;
  /** The structural fact base to score against, delivered inline (GT-589). */
  readonly repoFacts?: RepoFacts;
  readonly options?: ProposeC4BindingsOptions;
}

/** Raised when the caller asked for a proposal without supplying what one needs. */
export class C4BindingCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'C4BindingCollectionError';
  }
}

export interface C4BindingProposalProviderOptions {
  /** Injected clock, so a provenance timestamp is deterministic under test. */
  readonly now?: () => string;
}

export class C4BindingProposalProvider implements IQualitySignalProvider {
  readonly id = C4_BINDING_PROVIDER_ID;
  private readonly now: () => string;

  constructor(options: C4BindingProposalProviderOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  supports(ctx: CollectionContext): boolean {
    if (ctx.dimension === undefined) return true;
    return SUPPORTED_DIMENSIONS.has(ctx.dimension);
  }

  async collect(target: CollectionTarget, _ctx: CollectionContext): Promise<Evidence> {
    const config = (target.config ?? {}) as C4BindingCollectionConfig;
    const model = resolveModel(config);
    const facts = config.repoFacts;
    if (!facts) {
      throw new C4BindingCollectionError(
        'C4BindingProposalProvider needs a structural fact base: pass `repoFacts` on the target ' +
          'config. The Core never runs an indexer itself (ADR-0101).',
      );
    }

    const proposals = proposeC4Bindings(model, facts, config.options);

    return normalizeEvidence(
      {
        source: C4_BINDING_PROVIDER_ID,
        dimension: C4_BINDING_DIMENSION,
        // A guess about where an element lives. Declared, never inferred from the caller.
        determinism: 'probabilistic',
        metrics: metricsFor(proposals),
        findings: findingsFor(proposals),
        provenance: {
          collectedBy: C4_BINDING_PROVIDER_ID,
          adapterVersion: ADAPTER_VERSION,
          // The determinism claim participates in the hash (GT-613 precedent): relabelling these
          // proposals as measurements would change the artifact hash rather than pass unnoticed.
          artifactHash: artifactHash(proposals),
          timestamp: this.now(),
        },
        // NO calibration, deliberately. Nobody has measured how often this scorer is right, so
        // under GT-584 it is `advisory-uncalibrated` and inadmissible for blocking. Confirmation
        // comes from a human at the HITL gate, not from a threshold.
      },
      { now: this.now },
    );
  }
}

function resolveModel(config: C4BindingCollectionConfig): C4Model {
  if (config.model) return config.model;
  if (typeof config.dsl === 'string') return parseStructurizrDsl(config.dsl);
  throw new C4BindingCollectionError(
    'C4BindingProposalProvider needs the intended model: pass `dsl` (Structurizr text) or `model` ' +
      'on the target config.',
  );
}

function metricsFor(set: C4BindingProposalSet): Record<string, number> {
  const tops = set.proposals.map((p) => p.candidates[0]).filter((c) => c !== undefined);
  const confidences = tops.map((c) => c!.confidence);
  return {
    elements: set.proposals.length,
    elementsWithCandidate: tops.length,
    // Named so a reader cannot mistake it for a measured accuracy: it is the scorer's own opinion.
    topProposedConfidence: confidences.length ? Math.max(...confidences) : 0,
    meanProposedConfidence: confidences.length
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 10_000) / 10_000
      : 0,
  };
}

/**
 * One finding per element. Severity is `info` throughout — a proposal is a question for a human,
 * never a defect. An element with no plausible prefix is reported too: silence about it would read
 * as "nothing to decide" when the truth is "we could not guess".
 */
function findingsFor(set: C4BindingProposalSet) {
  return set.proposals.map((proposal) => {
    const top = proposal.candidates[0];
    return {
      code: top ? 'c4-binding-proposed' : 'c4-binding-unresolved',
      severity: 'info' as const,
      message: top
        ? `${proposal.elementName} (${proposal.elementId}) ↔ ${top.modulePrefix} — proposed at ` +
          `confidence ${top.confidence} (${top.moduleCount} modules; ` +
          `${top.signals.map((s) => s.kind).join(', ')}). Unconfirmed: cannot enforce anything.`
        : `${proposal.elementName} (${proposal.elementId}) — no module prefix resembles this ` +
          'element; a human must bind it or the diagram stays unenforceable here.',
      ...(top ? { location: top.modulePrefix } : {}),
    };
  });
}

/** Tamper-evidence over what was proposed, the tree it was proposed against, and the claim made. */
function artifactHash(set: C4BindingProposalSet): string {
  const digest = createHash('sha256')
    .update(
      JSON.stringify([
        set.schemaVersion,
        set.determinism,
        set.factsContentHash,
        set.proposals.map((p) => [
          p.elementId,
          p.candidates.map((c) => [c.modulePrefix, c.confidence, c.signals.map((s) => s.kind)]),
        ]),
      ]),
      'utf8',
    )
    .digest('hex');
  return `sha256:${digest}`;
}
