import { Injectable, Optional, Inject } from '@nestjs/common';
import {
  PhaseGateValidatorService,
  GateValidationResult,
} from '../../application/validators/phase-gate-validator.service';
import {
  EvaluatorKind,
  GateEvidence,
  GatePhase,
  GateViolation,
  deriveVerdict,
} from '../../domain/gate-evidence';
import { IWebhookNotifier } from '../ports/webhook-notifier.port';
import { IDomainEventBus } from '../ports/event-bus.port';
import { DomainEvents } from '../../domain/events/domain-events';
import { Role } from '../../domain/rbac/role';
import { gateRoleEnforcer } from '../../domain/rbac/gate-role-enforcer';

/**
 * Evaluates one SDLC phase gate and emits the ADR-0073 `GateEvidence` payload.
 *
 * Responsibility boundary (clarifies the validator/engine overlap noted in GT-03):
 *  - Gate evaluation (this use case) runs the phase-gates ruleset through
 *    `PhaseGateValidatorService` — evidence presence and blocking criteria.
 *  - General ruleset compliance stays with `ValidateSatelliteUseCase` and the
 *    `RuleEvaluationEngine` behind the `validate` command.
 */

/**
 * Maps gate-evidence phase names to gate numbers (1-based).
 * Derived from the default workflow gateMapping. Tenants with a custom
 * workflow can override this by providing their own gate-to-number mapping
 * alongside their IWorkflowDefinition.
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
  readonly requester?: any; // Replaces full type to avoid coupling inside use-case signature

  phase: GatePhase;
  projectPath: string;
  corePath?: string;
  evaluatedBy?: EvaluatorKind;
  webhookUrl?: string;
  /** Roles held by the actor requesting the gate evaluation (GT-320 RBAC enforcement). */
  actorRoles?: Role[];
  /** When true, the actor is requesting a waiver rather than an approval (GT-320). */
  requestWaiver?: boolean;
}

@Injectable()
export class EvaluateGateUseCase {
  constructor(
    @Inject('VALIDATOR_FACTORY') private readonly validatorFactory: (corePath?: string) => PhaseGateValidatorService,
    @Optional() @Inject('WEBHOOK_NOTIFIER') private readonly webhookNotifier?: IWebhookNotifier,
    @Optional() @Inject('EVENT_BUS') private readonly eventBus?: IDomainEventBus,
  ) {}

  async execute(input: EvaluateGateInput): Promise<GateEvidence> {
    const validator = this.validatorFactory(input.corePath);
    const gateNumber = PHASE_TO_GATE_NUMBER[input.phase];
    const result = await validator.validateGate(gateNumber, input.projectPath);
    const rulesetVersion = await validator.getRulesetVersion();
    const violations = this.toViolations(result);

    // GT-320: enforce accountableRole / waiverAuthority before recording verdict
    if (input.actorRoles && input.actorRoles.length > 0) {
      const gateId = this.slugify(result.name);
      const gateMeta = { accountableRole: result.accountableRole, waiverAuthority: result.waiverAuthority };
      if (input.requestWaiver) {
        gateRoleEnforcer.assertCanWaive(input.actorRoles, gateMeta, gateId);
      } else {
        gateRoleEnforcer.assertCanApprove(input.actorRoles, gateMeta, gateId);
      }
    }

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

    if (this.eventBus) {
      const projectId = input.projectPath;
      const commonFields = {
        projectId,
        phase: evidence.phase,
        gateId: evidence.gateId,
        rulesetRef: evidence.rulesetRef,
        rulesetVersion: evidence.rulesetVersion,
        evaluatedBy: evidence.evaluatedBy,
        evaluatedAt: evidence.evaluatedAt,
      };
      if (evidence.verdict === 'passed') {
        await this.eventBus.publish(DomainEvents.gateApproved(commonFields));
      } else if (evidence.verdict === 'failed') {
        await this.eventBus.publish(
          DomainEvents.gateRejected({ ...commonFields, violationCount: evidence.violations.length }),
        );
      }
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
