/**
 * StubPolicyValidationAdapter — a configurable, deterministic
 * {@link IPolicyValidationPort}. Default: allow everything. Inject a `decide`
 * predicate to simulate policy denials (used by the "policy validation failed"
 * test) without a live OPA. The real engine is {@link OpaCliPolicyValidationAdapter}.
 */

import type {
  IPolicyValidationPort,
  PolicyValidationRequest,
  PolicyValidationResult,
  PolicyViolation,
} from '../../domain/ports/policy-validation.port';

export type PolicyDecider = (request: PolicyValidationRequest) => PolicyViolation[];

export class StubPolicyValidationAdapter implements IPolicyValidationPort {
  constructor(private readonly decide: PolicyDecider = () => []) {}

  async validate(request: PolicyValidationRequest): Promise<PolicyValidationResult> {
    const violations = this.decide(request);
    return {
      allowed: violations.every((v) => v.severity !== 'error'),
      engine: 'opa',
      policyRef: request.policyRef,
      violations,
    };
  }
}

/** Convenience denier: blocks whenever the upstream evaluation verdict is FAIL. */
export const denyOnFailedEvaluation: PolicyDecider = (req) => {
  const evaluation = (req.input as Record<string, unknown>).evaluation as
    | { verdict?: string }
    | null
    | undefined;
  if (evaluation && evaluation.verdict === 'FAIL') {
    return [
      {
        ruleId: 'gate.must_pass_core_evaluation',
        message: 'Core evaluation returned FAIL; policy forbids advancing the gate.',
        severity: 'error',
      },
    ];
  }
  return [];
};
