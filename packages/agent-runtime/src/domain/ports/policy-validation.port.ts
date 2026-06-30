/**
 * IPolicyValidationPort — OPA / ruleset policy enforcement (design rules #6/#7).
 *
 * The runtime may propose and execute, but it cannot bypass gates or rewrite
 * rules. Capabilities flagged `requiresPolicy` route their result through this
 * port; a non-`allowed` outcome turns the runtime result into `blocked`.
 */

import type { RuntimeContext } from '../contracts/runtime-context';

export interface PolicyViolation {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
}

export interface PolicyValidationRequest {
  /** Logical policy/package to evaluate (e.g. 'evolith.gates.discovery'). */
  readonly policyRef?: string;
  /** The input document OPA evaluates (typically the capability output). */
  readonly input: Readonly<Record<string, unknown>>;
  readonly context: RuntimeContext;
}

export interface PolicyValidationResult {
  readonly allowed: boolean;
  readonly engine: 'opa' | 'native' | 'none';
  readonly policyRef?: string;
  readonly violations: readonly PolicyViolation[];
}

export interface IPolicyValidationPort {
  validate(request: PolicyValidationRequest): Promise<PolicyValidationResult>;
}
