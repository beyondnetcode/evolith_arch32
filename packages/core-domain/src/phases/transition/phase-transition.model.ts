export interface PhaseTransitionEvent {
  readonly fromPhase: number;
  readonly toPhase: number;
  readonly triggeredAt: string;
  readonly triggeredBy: string;
  readonly gateScore: number;
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
  return {
    fromPhase: from,
    toPhase: to,
    triggeredAt: new Date().toISOString(),
    triggeredBy,
    gateScore,
    approved,
    rejectionReason: approved ? undefined : `Cannot advance from phase ${from} to ${to}: score=${gateScore}/80 required, sequential advancement only`,
  };
}
