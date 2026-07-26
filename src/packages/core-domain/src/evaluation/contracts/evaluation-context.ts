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

// ---------------------------------------------------------------------------
// Context-only reference types (NOT Core entities; opaque to the Core)
// ---------------------------------------------------------------------------

/** Opaque tenant echo. Never interpreted or persisted by the Core. */
export interface TenantContext {
  readonly tenantId: string;
}

export interface RequesterContext {
  readonly requesterId: string;
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

export interface RepoFacts {
  readonly symbols: readonly string[];
  readonly dependencies: readonly string[];
}

export interface C4Binding {
  readonly c4ElementId: string;
  readonly symbols: readonly string[];
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
  readonly requester?: RequesterContext;

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
  readonly checkpoint?: CheckpointContext;
  readonly deployment?: DeploymentContext;
  readonly architecture?: ArchitectureContext;
  readonly design?: DesignContext;
  readonly externalReferences?: readonly ExternalReferenceContext[];
  readonly facts?: {
    readonly repoFacts?: RepoFacts;
    readonly architectureBindings?: readonly C4Binding[];
  };

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
