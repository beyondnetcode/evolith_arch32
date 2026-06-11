import { Injectable, Optional, Inject } from '@nestjs/common';
import {
  PhaseGateValidatorService,
  GateValidationResult,
} from '../../core/validators/phase-gate-validator.service';
import {
  EvaluatorKind,
  GateEvidence,
  GatePhase,
  GateViolation,
  deriveVerdict,
} from '../../domain/gate-evidence';
import { WebhookNotifierPort } from '../ports/webhook-notifier.port';

/**
 * Evaluates one SDLC phase gate and emits the ADR-0073 `GateEvidence` payload.
 *
 * Responsibility boundary (clarifies the validator/engine overlap noted in GT-03):
 *  - Gate evaluation (this use case) runs the phase-gates ruleset through
 *    `PhaseGateValidatorService` — evidence presence and blocking criteria.
 *  - General ruleset compliance stays with `ValidateSatelliteUseCase` and the
 *    `RuleEvaluationEngine` behind the `validate` command.
 */

export const PHASE_TO_GATE_NUMBER: Record<GatePhase, number> = {
  discovery: 1,
  design: 2,
  construction: 3,
  qa: 4,
  release: 5,
};

export const PHASE_GATES_RULESET_REF = 'rulesets/sdlc/phase-gates.rules.json';

export interface EvaluateGateInput {
  phase: GatePhase;
  projectPath: string;
  corePath?: string;
  evaluatedBy?: EvaluatorKind;
  webhookUrl?: string;
}

@Injectable()
export class EvaluateGateUseCase {
  constructor(
    @Optional() @Inject('VALIDATOR_FACTORY') private readonly validatorFactory: (corePath?: string) => PhaseGateValidatorService =
      corePath => new PhaseGateValidatorService(corePath),
    @Optional() @Inject('WEBHOOK_NOTIFIER') private readonly webhookNotifier?: WebhookNotifierPort
  ) {}

  async execute(input: EvaluateGateInput): Promise<GateEvidence> {
    const validator = this.validatorFactory(input.corePath);
    const gateNumber = PHASE_TO_GATE_NUMBER[input.phase];
    const result = await validator.validateGate(gateNumber, input.projectPath);
    const rulesetVersion = await validator.getRulesetVersion();
    const violations = this.toViolations(result);

    const evidence: GateEvidence = {
      gateId: this.slugify(result.name),
      phase: input.phase,
      verdict: deriveVerdict(violations),
      rulesetRef: PHASE_GATES_RULESET_REF,
      rulesetVersion,
      violations,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: input.evaluatedBy ?? 'human',
    };

    if (input.webhookUrl && this.webhookNotifier) {
      await this.webhookNotifier.notify(input.webhookUrl, evidence);
    }

    return evidence;
  }

  private toViolations(result: GateValidationResult): GateViolation[] {
    const violations: GateViolation[] = [];

    for (const evidence of result.evidenceResults) {
      if (evidence.passed) continue;
      violations.push({
        ruleId: `${result.gateId}-EVIDENCE-${this.slugify(evidence.artifact)}`,
        severity: evidence.required ? 'error' : 'warning',
        location: evidence.artifact,
        message: evidence.validationMessage || `Mandatory evidence '${evidence.artifact}' not satisfied`,
      });
    }

    for (const check of result.blockingChecks) {
      if (!check.triggered) continue;
      violations.push({
        ruleId: `${result.gateId}-BLOCKING-${this.slugify(check.criterion).slice(0, 48)}`,
        severity: 'error',
        location: result.name,
        message: `Blocking criterion triggered: ${check.criterion} — ${check.action}`,
      });
    }

    return violations;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
