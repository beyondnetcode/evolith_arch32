/**
 * Artifact lifecycle state machine (GT-316).
 *
 * Tracks the state of a tracked artifact (ADR, blueprint, spec, etc.) through
 * its lifecycle. The machine validates transitions and optionally emits domain
 * events via the injected IDomainEventBus.
 */

import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import { DomainEvents } from '../events/domain-events';

// ---------------------------------------------------------------------------
// ArtifactState enum
// ---------------------------------------------------------------------------

export enum ArtifactState {
  /** Artifact created but not yet submitted for validation. */
  DRAFT = 'DRAFT',
  /** Submitted for validation review. */
  SUBMITTED = 'SUBMITTED',
  /** Validation is in progress (automated or human review). */
  VALIDATING = 'VALIDATING',
  /** Passed all validation checks. */
  VALIDATED = 'VALIDATED',
  /** Failed validation; returned for rework. */
  REJECTED = 'REJECTED',
  /** Superseded or retired; no longer active. */
  ARCHIVED = 'ARCHIVED',
}

// ---------------------------------------------------------------------------
// Valid transition map
// ---------------------------------------------------------------------------

/**
 * Allowed transitions: keys are source states, values are sets of valid
 * target states. Any transition not in this map is forbidden.
 */
export const ARTIFACT_TRANSITIONS: Readonly<Record<ArtifactState, readonly ArtifactState[]>> = {
  [ArtifactState.DRAFT]:      [ArtifactState.SUBMITTED, ArtifactState.ARCHIVED],
  [ArtifactState.SUBMITTED]:  [ArtifactState.VALIDATING, ArtifactState.DRAFT, ArtifactState.ARCHIVED],
  [ArtifactState.VALIDATING]: [ArtifactState.VALIDATED, ArtifactState.REJECTED],
  [ArtifactState.VALIDATED]:  [ArtifactState.ARCHIVED],
  [ArtifactState.REJECTED]:   [ArtifactState.DRAFT, ArtifactState.ARCHIVED],
  [ArtifactState.ARCHIVED]:   [],
};

// ---------------------------------------------------------------------------
// ArtifactStateMachine
// ---------------------------------------------------------------------------

export interface ArtifactTransitionContext {
  /** Identifies the artifact (e.g. file path or logical id). */
  artifactPath: string;
  artifactType?: string;
  /** Project the artifact belongs to. */
  projectId: string;
  correlationId?: string;
}

export class ArtifactStateMachine {
  constructor(private readonly eventBus?: IDomainEventBus) {}

  /**
   * Validate and execute a state transition.
   *
   * @returns `true` if the transition is valid.
   * @throws `Error` if the transition is not allowed.
   */
  transition(
    from: ArtifactState,
    to: ArtifactState,
    ctx?: ArtifactTransitionContext,
  ): true {
    const allowed = ARTIFACT_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid artifact transition: ${from} → ${to}. ` +
        `Allowed targets from ${from}: [${allowed.join(', ') || 'none'}]`,
      );
    }

    // Emit domain event if bus is available
    if (this.eventBus && ctx) {
      const event = DomainEvents.artifactUpdated(
        {
          projectId: ctx.projectId,
          artifactPath: ctx.artifactPath,
          artifactType: ctx.artifactType,
        },
        ctx.correlationId,
      );
      // fire-and-forget; callers may await if needed
      void this.eventBus.publish(event);
    }

    return true;
  }

  /**
   * Check whether a transition is valid without throwing.
   */
  canTransition(from: ArtifactState, to: ArtifactState): boolean {
    return ARTIFACT_TRANSITIONS[from].includes(to);
  }

  /**
   * Return all valid target states from the given source state.
   */
  allowedTransitions(from: ArtifactState): readonly ArtifactState[] {
    return ARTIFACT_TRANSITIONS[from];
  }
}
