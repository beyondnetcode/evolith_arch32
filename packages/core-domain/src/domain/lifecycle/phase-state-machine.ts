/**
 * Phase lifecycle state machine (GT-316).
 *
 * Tracks the state of an SDLC phase as it progresses from pending through
 * gate review to completion. Emits domain events via the injected
 * IDomainEventBus when transitions occur.
 */

import type { IDomainEventBus } from '../../application/ports/event-bus.port';
import { DomainEvents } from '../events/domain-events';
import type { GatePhase } from '../gate-evidence';

// ---------------------------------------------------------------------------
// PhaseState enum
// ---------------------------------------------------------------------------

export enum PhaseState {
  /** Phase defined but work has not started. */
  PENDING = 'PENDING',
  /** Work is actively in progress. */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Work complete; awaiting gate evaluation. */
  GATE_PENDING = 'GATE_PENDING',
  /** Gate passed; phase signed off. */
  APPROVED = 'APPROVED',
  /** Gate rejected; phase must be reworked. */
  REJECTED = 'REJECTED',
  /** Phase archived (superseded or historical). */
  ARCHIVED = 'ARCHIVED',
}

// ---------------------------------------------------------------------------
// Valid transition map
// ---------------------------------------------------------------------------

export const PHASE_TRANSITIONS: Readonly<Record<PhaseState, readonly PhaseState[]>> = {
  [PhaseState.PENDING]:      [PhaseState.IN_PROGRESS, PhaseState.ARCHIVED],
  [PhaseState.IN_PROGRESS]:  [PhaseState.GATE_PENDING, PhaseState.PENDING, PhaseState.ARCHIVED],
  [PhaseState.GATE_PENDING]: [PhaseState.APPROVED, PhaseState.REJECTED],
  [PhaseState.APPROVED]:     [PhaseState.ARCHIVED],
  [PhaseState.REJECTED]:     [PhaseState.IN_PROGRESS, PhaseState.ARCHIVED],
  [PhaseState.ARCHIVED]:     [],
};

// ---------------------------------------------------------------------------
// PhaseStateMachine
// ---------------------------------------------------------------------------

export interface PhaseTransitionContext {
  projectId: string;
  /** The SDLC gate phase this state machine governs. */
  phase: GatePhase;
  startedBy?: string;
  correlationId?: string;
}

export class PhaseStateMachine {
  constructor(private readonly eventBus?: IDomainEventBus) {}

  /**
   * Validate and execute a phase state transition.
   *
   * Emits `phase.started` when transitioning into IN_PROGRESS and
   * `phase.completed` when transitioning into APPROVED.
   *
   * @returns `true` if the transition is valid.
   * @throws `Error` if the transition is not allowed.
   */
  transition(
    from: PhaseState,
    to: PhaseState,
    ctx?: PhaseTransitionContext,
  ): true {
    const allowed = PHASE_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid phase transition: ${from} → ${to}. ` +
        `Allowed targets from ${from}: [${allowed.join(', ') || 'none'}]`,
      );
    }

    if (this.eventBus && ctx) {
      if (to === PhaseState.IN_PROGRESS) {
        void this.eventBus.publish(
          DomainEvents.phaseStarted(
            { projectId: ctx.projectId, phase: ctx.phase, startedBy: ctx.startedBy },
            ctx.correlationId,
          ),
        );
      } else if (to === PhaseState.APPROVED) {
        void this.eventBus.publish(
          DomainEvents.phaseCompleted(
            { projectId: ctx.projectId, phase: ctx.phase, completedAt: new Date().toISOString() },
            ctx.correlationId,
          ),
        );
      }
    }

    return true;
  }

  /**
   * Check whether a transition is valid without throwing.
   */
  canTransition(from: PhaseState, to: PhaseState): boolean {
    return PHASE_TRANSITIONS[from].includes(to);
  }

  /**
   * Return all valid target states from the given source state.
   */
  allowedTransitions(from: PhaseState): readonly PhaseState[] {
    return PHASE_TRANSITIONS[from];
  }
}
