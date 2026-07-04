import { Injectable } from '@nestjs/common';
import { EvaluateGateUseCase } from './evaluate-gate.use-case';
import { GatePhase, PhaseTransitionProposal, EvaluatorKind } from '../../domain/gate-evidence';

export interface ProposePhaseAdvanceInput {
  fromPhase: GatePhase;
  toPhase: GatePhase;
  projectPath: string;
  corePath?: string;
  evaluatedBy?: EvaluatorKind;
  webhookUrl?: string;
}

/**
 * GT-13: Autonomous phase advance proposal runner.
 * 
 * Evaluates the exit criteria (gate) for the current phase (`fromPhase`)
 * without mutating the canonical state, returning a transition proposal 
 * indicating whether moving to `toPhase` is recommended based on the evidence.
 */
@Injectable()
export class ProposePhaseAdvanceUseCase {
  constructor(private readonly evaluateGateUseCase: EvaluateGateUseCase) {}

  async execute(input: ProposePhaseAdvanceInput): Promise<PhaseTransitionProposal> {
    const evidence = await this.evaluateGateUseCase.execute({
      phase: input.fromPhase,
      projectPath: input.projectPath,
      corePath: input.corePath,
      evaluatedBy: input.evaluatedBy ?? 'agent',
      webhookUrl: input.webhookUrl,
    });

    const isRecommended = evidence.verdict === 'passed';

    return {
      fromPhase: input.fromPhase,
      toPhase: input.toPhase,
      evidence,
      isRecommended,
      proposedAt: new Date().toISOString(),
    };
  }
}
