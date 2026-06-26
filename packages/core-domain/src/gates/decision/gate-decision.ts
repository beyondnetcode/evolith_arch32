export type GateVerdict = 'PASS' | 'FAIL' | 'WAIVED';

export interface GateDecision {
  readonly gateId: string;
  readonly phase: number;
  readonly verdict: GateVerdict;
  readonly score: number;
  readonly violations: string[];
  readonly decidedAt: string;
  readonly decidedBy: string;
  readonly waiverRef?: string;
}

export function makeGateDecision(
  gateId: string,
  phase: number,
  score: number,
  violations: string[],
  decidedBy = 'system',
): GateDecision {
  const verdict: GateVerdict = violations.length === 0 && score >= 80 ? 'PASS' : 'FAIL';
  return { gateId, phase, verdict, score, violations, decidedAt: new Date().toISOString(), decidedBy };
}
