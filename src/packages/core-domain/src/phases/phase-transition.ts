import { ILogger } from '../domain/interfaces';

export interface TransitionRequest {
  projectPath: string;
  currentPhase: number;
  targetPhase: number;
  gateScore: number;
}

export interface TransitionResult {
  eligible: boolean;
  reason: string;
  requiredScore: number;
  actualScore: number;
}

const MINIMUM_GATE_SCORE = 80;

export class PhaseTransitionService {
  constructor(private readonly logger: ILogger) {}

  canTransition(req: TransitionRequest): TransitionResult {
    const requiredScore = this.getRequiredScore(req.currentPhase);

    if (req.targetPhase !== req.currentPhase + 1) {
      const reason = `Non-sequential transition rejected: cannot advance from phase ${req.currentPhase} to phase ${req.targetPhase}. Only sequential transitions are allowed.`;
      this.logger.warn(reason, { projectPath: req.projectPath });
      return { eligible: false, reason, requiredScore, actualScore: req.gateScore };
    }

    if (req.gateScore < requiredScore) {
      const reason = `Gate score ${req.gateScore} is below the required ${requiredScore} to advance from phase ${req.currentPhase} to phase ${req.targetPhase}.`;
      this.logger.info(reason, { projectPath: req.projectPath });
      return { eligible: false, reason, requiredScore, actualScore: req.gateScore };
    }

    const reason = `Eligible to advance from phase ${req.currentPhase} to phase ${req.targetPhase} with score ${req.gateScore}.`;
    this.logger.info(reason, { projectPath: req.projectPath });
    return { eligible: true, reason, requiredScore, actualScore: req.gateScore };
  }

  getRequiredScore(phase: number): number {
    void phase;
    return MINIMUM_GATE_SCORE;
  }
}
