// Shared shapes of the phase-gate validation contract.
//
// They live in their own module rather than in `phase-gate-validator.service.ts`
// because that service constructs the collaborators that consume them
// (EvidenceValidator, BlockingCriteriaValidator, RulesetLoader): having those
// collaborators import the types back from the service closed runtime import
// cycles. `phase-gate-validator.service.ts` re-exports everything here, so every
// existing import path keeps working.

export interface PhaseGateDefinition {
  phase: number;
  name: string;
  description: string;
  mandatoryEvidence: EvidenceRequirement[];
  blockingCriteria: BlockingCriterion[];
  accountableRole: string;
  waiverAuthority: string;
  waiverRequiredFields: string[];
}

export interface EvidenceRequirement {
  artifact: string;
  schemaRef?: string;
  status?: string;
  validation: string;
}

export interface BlockingCriterion {
  criterion: string;
  action: string;
}

export interface GateValidationResult {
  gateId: string;
  phase: number;
  name: string;
  passed: boolean;
  evidenceResults: EvidenceValidationResult[];
  blockingChecks: BlockingCheckResult[];
  waiverAvailable: boolean;
  accountableRole: string;
  waiverAuthority: string;
  /** Stable canonical gate ID from GateRegistryService, e.g. "gate-f1" (GT-318) */
  canonicalGateId?: string;
  /** .rego rule paths cited in the canonical gate definition (GT-318) */
  opaRules?: string[];
}

export interface EvidenceValidationResult {
  artifact: string;
  passed: boolean;
  found: boolean;
  schemaValid: boolean;
  validationMessage: string;
  required: boolean;
}

export interface BlockingCheckResult {
  criterion: string;
  triggered: boolean;
  action: string;
}

export interface PhaseGatesRuleset {
  version?: string;
  gates: PhaseGateDefinition[];
}
