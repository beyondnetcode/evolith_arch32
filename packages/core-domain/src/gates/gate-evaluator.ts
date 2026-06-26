import { PhaseGateValidatorService } from '../application/validators/phase-gate-validator.service';
import { ILogger } from '../domain/interfaces';

export interface GateEvaluationResult {
  phase: number;
  passed: boolean;
  score: number;
  violations: string[];
  timestamp: string;
}

export class GateEvaluator {
  constructor(
    private readonly phaseGateValidator: PhaseGateValidatorService,
    private readonly logger: ILogger,
  ) {}

  async evaluate(projectPath: string, phase: number): Promise<GateEvaluationResult> {
    this.logger.debug(`Evaluating gate for phase ${phase} at ${projectPath}`);

    const result = await this.phaseGateValidator.validateGate(phase, projectPath);

    const totalEvidence = result.evidenceResults.length;
    const passedEvidence = result.evidenceResults.filter(e => e.passed).length;
    const score = totalEvidence > 0 ? (passedEvidence / totalEvidence) * 100 : 0;

    const violations: string[] = [];

    for (const evidence of result.evidenceResults) {
      if (!evidence.passed) {
        violations.push(evidence.validationMessage || `Evidence not satisfied: ${evidence.artifact}`);
      }
    }

    for (const check of result.blockingChecks) {
      if (check.triggered) {
        violations.push(`Blocking criterion triggered: ${check.criterion} — ${check.action}`);
      }
    }

    this.logger.info(
      `Gate ${phase} evaluation complete: passed=${result.passed}, score=${score.toFixed(1)}, violations=${violations.length}`,
    );

    return {
      phase: result.phase,
      passed: result.passed,
      score,
      violations,
      timestamp: new Date().toISOString(),
    };
  }
}
