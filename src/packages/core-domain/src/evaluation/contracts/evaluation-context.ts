/**
 * Canonical EvaluationContext contract (GT-377 / ADR-0101).
 *
 * What a consumer (Evolith Tracker, CLI, MCP, CI) SENDS to the stateless Core
 * Evaluation Engine. The Core interprets this as **temporary evaluation context
 * only** — it never persists or owns product/tenant/initiative/evidence/decision.
 * All `*Id` fields are OPAQUE context identifiers, never Core entities
 * (ADR-0101; gate-evidence.ts ExecutionContext "Never persisted or interpreted").
 *
 * NOTE: distinct from the filesystem `EvaluationContext`
 * (`application/validators/evaluators/evaluator.interface.ts`, `{satellitePath,
 * corePath}`) which is an internal rule-evaluator strategy context. That one is
 * scheduled to be renamed to `WorkspaceEvaluationContext` (GT-377).
 */

import type { PhaseId } from '../../domain/sdlc/phase-id';
import type { Verdict } from '../../domain/verdict/verdict';
import type { Evidence } from './quality-evidence';
import type { RepoFacts, SymbolBoundaryRule } from './repo-facts';

/** Schema version of this contract (bumped only on incompatible changes). */
export const EVALUATION_CONTEXT_SCHEMA_VERSION = '1.0.0';

/** Evaluation types a consumer may request in a single call. */
export type EvaluationKind =
  | 'gate'
  | 'artifact'
  | 'evidence'
  | 'architecture'
  | 'blueprint'
  | 'topology'
  | 'checkpoint'
  | 'deployment'
  | 'rule'
  | 'compliance'
  | 'design'
  | 'phase-artifacts';

/** Execution mode the consumer is operating under (drives HITL routing). */
export type ExecutionMode = 'manual' | 'hybrid' | 'agentic';

/**
 * GT-586 — who ASKED for this evaluation.
 *
 * Deliberately distinct from {@link ExecutionMode}, which describes the mode of
 * operation and carries no identity, and from `EvidenceContext.producer`, which
 * attributes ONE evidence item rather than the request. The vocabulary is kept
 * identical to `producer.actorType` on purpose: a verdict and the evidence it
 * judged must be attributable in the same terms.
 *
 * Opaque to the Core like every other `*Id` on the context (ADR-0101): echoed
 * into the result for attribution, never interpreted and never persisted here.
 */
export type RequesterActorType = 'human' | 'agent' | 'ci' | 'system';

export interface RequesterContext {
  readonly actorType: RequesterActorType;
  /** Opaque id of the actor (user id, agent id, CI job id, service name). */
  readonly actorId: string;
  /** Model that drove the request, when `actorType` is `'agent'`. */
  readonly modelRef?: string;
  /** Conversation/run that this evaluation belongs to; joins a verdict series. */
  readonly sessionId?: string;
  /** Prompt/skill versions, mirroring `EvidenceContext.producer`. */
  readonly promptVersion?: string;
  readonly skillVersion?: string;
}

/**
 * GT-586 — WHICH revision of the code the verdict judged.
 *
 * Only `revision` is required, and the whole object is optional: a consumer that
 * cannot determine a revision sends nothing. The Core NEVER derives or invents a
 * value — an invented commit sha in an audit trail is worse than an absent one —
 * so a result whose `repositoryRevision` is absent is a truthful statement that
 * the consumer did not supply one.
 */
export interface RepositoryRevisionContext {
  /** Commit sha, tag, or any opaque revision identifier the consumer owns. */
  readonly revision: string;
  /** Repository the revision belongs to, when the context spans more than one. */
  readonly repositoryRef?: string;
  readonly branch?: string;
  /** ISO-8601 UTC. */
  readonly committedAt?: string;
  /** True when the evaluated tree carried uncommitted changes on top of `revision`. */
  readonly dirty?: boolean;
}

// ---------------------------------------------------------------------------
// Context-only reference types (NOT Core entities; opaque to the Core)
// ---------------------------------------------------------------------------

/** Opaque tenant echo. Never interpreted or persisted by the Core. */
export interface TenantContext {
  readonly tenantId: string;
}

export interface ProductContext {
  readonly productId: string;
  readonly tenantId?: string;
  readonly name?: string;
  readonly repositoryRef?: string;
}

export interface InitiativeContext {
  readonly initiativeId: string;
  readonly productId?: string;
  readonly tenantId?: string;
  readonly kind?: string;
  readonly title?: string;
}

export interface InitiativeGroupContext {
  readonly initiativeGroupId: string;
  readonly initiativeIds?: readonly string[];
}

/** Optional pointer to an external work item. Reference + hash, never a copy. */
export interface ExternalReferenceContext {
  readonly system: string; // 'jira' | 'azure-devops' | 'github' | 'gitlab' | ...
  readonly kind: string; // 'epic' | 'story' | 'issue' | 'task' | 'pull_request' | ...
  readonly externalId: string;
  readonly url?: string;
  readonly contentHash?: string;
  readonly snapshotAt?: string;
}

export interface DeploymentContext {
  readonly environment: string;
  readonly releaseRef: string;
  readonly status?: string;
}

export interface ArchitectureContext {
  readonly style?: string;
  readonly components?: readonly string[];
  /** References to ADRs/decisions, not copies. */
  readonly decisionRefs?: readonly string[];
  readonly constraints?: readonly string[];
  /**
   * GT-589 — boundaries declared over SYMBOLS rather than over files. Policy, so
   * it travels on the context; the structural facts it is evaluated against travel
   * on {@link EvaluationContext.repoFacts}. Ignored when no `repoFacts` are sent.
   */
  readonly symbolBoundaries?: readonly SymbolBoundaryRule[];
}

/** Declared evidence (maps Tracker EvidenceItem). The Core receives references, not stored copies. */
export interface EvidenceContext {
  readonly evidenceId: string;
  readonly evidenceType: string;
  readonly schemaRef?: string;
  readonly producer?: {
    readonly actorType: 'human' | 'agent' | 'ci' | 'system';
    readonly actorId: string;
    readonly modelRef?: string;
    readonly promptVersion?: string;
    readonly skillVersion?: string;
  };
  readonly references?: readonly ExternalReferenceContext[];
  readonly integrity?: { readonly contentHash: string; readonly capturedAt?: string };
}

export interface CheckpointContext {
  readonly checkpointId: string;
  readonly phaseId?: PhaseId;
  readonly status?: string;
  readonly metrics?: Readonly<Record<string, number | string>>;
}

/**
 * One concern (frontend/backend/services/mobile/data/…) of a composed blueprint
 * (ADR-0104 §3). The blueprint is the "box of blocks": each concern composes its
 * own blocks/refs. `concern` is an open string under Convention over
 * Configuration — new concerns are added by convention, not enumerated here.
 */
/** A composed design block declared for evaluation (mirrors blueprint.schema.json blockList). */
export interface DesignBlockRef {
  readonly blockKind: string;
  readonly ref?: string;
  readonly scope?: 'core' | 'tenant';
  readonly status?: string;
}

export interface DesignConcernContext {
  readonly concern: string;
  readonly topologies?: readonly string[];
  readonly runtime?: string;
  readonly architecture?: string;
  readonly blueprintRef?: string;
  /** Blocks composed for this concern. */
  readonly blocks?: readonly DesignBlockRef[];
}

/**
 * Design facet (ADR-0104). Topology recommended in Discovery / confirmed in
 * Design as a composition (mixed topologies). All refs are read-only pointers;
 * the Core evaluates the union of the confirmed composition and never persists.
 */
export interface DesignContext {
  /** Topology (or composition) recommended in Discovery. Advisory. */
  readonly topologyRecommendedRefs?: readonly string[];
  /** Topology composition confirmed in Design. Drives the designProfile union. */
  readonly topologyConfirmedRefs?: readonly string[];
  /** The composed blueprint under evaluation (the development guide). */
  readonly blueprintRef?: string;
  /** Blueprint-level blocks not scoped to one concern (e.g. universal blocks). */
  readonly blocks?: readonly DesignBlockRef[];
  /** Per-concern composition (frontend/backend/services/mobile/data/…). */
  readonly concerns?: readonly DesignConcernContext[];
  /** Declared design-artifact block refs (plans, matrices, etc.). */
  readonly artifactRefs?: readonly string[];
  readonly adrRefs?: readonly string[];
  /**
   * Tenant private-collection refs (ADRs/templates/rulesets/blueprints kept at
   * Tracker scope) — ADR-0104 §11. Merged with the canonical corpus at
   * evaluation time; never persisted by the Core.
   */
  readonly tenantCollectionRefs?: readonly string[];
  /** Iteration version of the maturing blueprint (DS-09; configurable cycle). */
  readonly iterationVersion?: number;
}

/** A required vs presented artifact pairing for a gate/phase. */
export interface ArtifactContext {
  /** Artifact ids the active SDLC config expects at this phase/gate. */
  readonly required?: readonly string[];
  /** Artifacts actually presented for evaluation. */
  readonly presented?: readonly {
    readonly artifactId: string;
    readonly type?: string;
    readonly ref?: string;
    readonly schemaRef?: string;
  }[];
}

/** Reference to a prior canonical decision (Tracker owns the GateDecision). */
export interface DecisionHistoryRef {
  readonly decisionId: string;
  readonly gateId?: string;
  readonly phaseId?: PhaseId;
  readonly verdict?: Verdict;
}

// ---------------------------------------------------------------------------
// EvaluationContext — the request payload
// ---------------------------------------------------------------------------

export interface EvaluationContext {
  /** Which evaluations are requested in this call. */
  readonly kinds: readonly EvaluationKind[];

  // --- Opaque context identifiers (NOT Core entities) ---
  readonly tenant?: TenantContext;
  readonly product?: ProductContext;
  readonly initiative?: InitiativeContext;
  readonly initiativeGroup?: InitiativeGroupContext;

  // --- Evaluation anchoring ---
  readonly phaseId?: PhaseId;
  readonly gateId?: string;

  // --- Opaque workspace reference (ADR-0074; the Core never receives raw paths) ---
  readonly workspaceRef?: string;

  // --- Declared facts to evaluate (not scanned from disk) ---
  readonly artifacts?: ArtifactContext;
  readonly evidence?: readonly EvidenceContext[];
  /**
   * Canonical quality-signal evidence (ADR-0111 / GT-533). Collected by external
   * tools behind the orchestration-owned `IQualitySignalProvider` port and passed
   * INLINE here — the identical shape to `OverlayFileSystem` source-file ingestion
   * (ADR-0080). The Core evaluates the received `Evidence[]` and NEVER executes a
   * provider; a dimension with no evidence yields a `no-evidence` signal, not a
   * failure. See {@link resolveEvidenceSignals}.
   */
  readonly qualitySignals?: readonly Evidence[];
  /**
   * Canonical structural fact base (GT-589). Produced OUTSIDE the Core by an
   * indexer (`@beyondnet/evolith-repo-facts` → TypeScript compiler API / SCIP /
   * tree-sitter) and passed INLINE here — the identical shape to `qualitySignals`
   * (ADR-0111) and to `OverlayFileSystem` source-file ingestion (ADR-0080). The
   * Core queries the received graph and NEVER runs an indexer, opens a repository
   * or retains facts between evaluations (ADR-0101). Absent ⇒ the architecture
   * evaluator reports no structural findings, never a failure it caused itself.
   */
  readonly repoFacts?: RepoFacts;
  /**
   * GT-594 — the SAME repository at an earlier revision, for the signals that only
   * exist between two points in time (refactor:copy) and for the per-signal
   * conformance delta.
   *
   * Delivered inline for the same reason `repoFacts` is: the Core is stateless and
   * holds nothing between evaluations (ADR-0101), so "the previous revision" cannot
   * be something it remembers — it is something the consumer sends. Absent ⇒ the
   * two-revision signals report `not-measurable`, never zero.
   */
  readonly baselineRepoFacts?: RepoFacts;
  readonly checkpoint?: CheckpointContext;
  readonly deployment?: DeploymentContext;
  readonly architecture?: ArchitectureContext;
  readonly design?: DesignContext;
  readonly externalReferences?: readonly ExternalReferenceContext[];

  // --- Tenant configuration & constraints (sent explicitly; the Core resolves nothing) ---
  readonly sdlcConfig?: Readonly<Record<string, unknown>>;
  readonly customConstraints?: Readonly<Record<string, unknown>>;

  // --- Versioned pointers to Core definitions (read-only) ---
  readonly rulesetRef?: string;
  readonly rulesetVersion?: string;
  readonly policyRefs?: readonly string[];
  readonly blueprintRef?: string;
  readonly topologyRef?: string;
  readonly schemaRef?: string;

  // --- Attribution (GT-586; additive, both optional) ---
  /**
   * Who requested this evaluation. Echoed verbatim onto the result so a verdict
   * can name a human or an agent. Absent means the consumer did not declare one.
   */
  readonly requester?: RequesterContext;
  /**
   * The code revision under evaluation. Echoed verbatim onto the result so two
   * verdicts over the same repository can be ordered against the code they judged.
   */
  readonly repositoryRevision?: RepositoryRevisionContext;

  // --- Mode & expectation ---
  readonly executionMode?: ExecutionMode;
  readonly decisionHistory?: readonly DecisionHistoryRef[];
  readonly expectedResult?: Verdict;

  // --- Correlation (echoed, never interpreted) ---
  readonly correlationId?: string;
  readonly passthrough?: Readonly<Record<string, unknown>>;

  /** Contract schema version the consumer is sending. */
  readonly schemaVersion?: string;
}

/**
 * GT-688 — the ONE place that answers "which topologies did this context confirm".
 *
 * Arity contract, in force since ADR-0104 and previously duplicated in two
 * evaluators (`kind-evaluators.ts:539` and `:690`):
 *  - a non-empty `design.topologyConfirmedRefs` IS the answer;
 *  - otherwise `topologyRef` is read as a SINGLE-ELEMENT SHORTHAND;
 *  - otherwise the empty composition.
 *
 * The plural wins on disagreement. `topologyRefIsShadowed` exists so that a
 * caller which set both and meant the scalar is TOLD, instead of having it
 * dropped in silence.
 */
export function confirmedTopologies(ctx: EvaluationContext): readonly string[] {
  const plural = ctx.design?.topologyConfirmedRefs;
  if (plural && plural.length > 0) return [...new Set(plural)];
  return ctx.topologyRef ? [ctx.topologyRef] : [];
}

/** True when a scalar `topologyRef` was set but a composition overrode it. */
export function topologyRefIsShadowed(ctx: EvaluationContext): boolean {
  const plural = ctx.design?.topologyConfirmedRefs;
  return !!ctx.topologyRef && !!plural && plural.length > 0 && !plural.includes(ctx.topologyRef);
}

/**
 * The three progressive-axis ids. Mutually exclusive on ONE repository.
 *
 * Mirrors the VALUES of `PROGRESSIVE_PHASE_TOPOLOGY`
 * (`application/validators/rule-applicability.ts`) and is duplicated
 * DELIBERATELY: `evaluation/contracts/` may not import
 * `application/validators/`. The equality is asserted by a test so the two
 * cannot drift.
 */
export const PROGRESSIVE_AXIS_TOPOLOGIES: readonly string[] = Object.freeze([
  'modular-monolith',
  'distributed-modules',
  'microservices',
]);

/** The progressive-axis members of a composition. Length > 1 ⇒ contradictory. */
export function progressiveAxisMembers(topologies: readonly string[]): readonly string[] {
  return topologies.filter((t) => PROGRESSIVE_AXIS_TOPOLOGIES.includes(t));
}
