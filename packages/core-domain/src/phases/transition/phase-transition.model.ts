/**
 * Phase transition model — updated to use canonical PhaseState vocabulary (GT-316).
 *
 * The raw `approved: boolean` field is superseded by the `PhaseState` enum
 * from the lifecycle state machine. Backward-compatible factory included.
 */

import { PhaseState } from '../../domain/lifecycle/phase-state-machine';
export type { PhaseState };

export interface PhaseTransitionEvent {
  readonly fromPhase: number;
  readonly toPhase: number;
  readonly triggeredAt: string;
  readonly triggeredBy: string;
  readonly gateScore: number;
  /** Canonical state the destination phase moves into. */
  readonly targetState: PhaseState;
  /** @deprecated Use `targetState !== PhaseState.REJECTED` instead. */
  readonly approved: boolean;
  readonly rejectionReason?: string;
}

export function createTransitionEvent(
  from: number,
  to: number,
  gateScore: number,
  triggeredBy = 'system',
): PhaseTransitionEvent {
  const approved = to === from + 1 && gateScore >= 80;
  const targetState = approved ? PhaseState.APPROVED : PhaseState.REJECTED;
  return {
    fromPhase: from,
    toPhase: to,
    triggeredAt: new Date().toISOString(),
    triggeredBy,
    gateScore,
    targetState,
    approved,
    rejectionReason: approved
      ? undefined
      : `Cannot advance from phase ${from} to ${to}: score=${gateScore}/80 required, sequential advancement only`,
  };
}
