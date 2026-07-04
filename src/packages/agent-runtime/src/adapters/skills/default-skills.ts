/**
 * Default skill catalog. Each entry maps an INTENT to a governed capability and
 * declares its posture (permissions, approval, trace, policy). This is the
 * single place that wires the practical use-cases from the design brief to
 * `.harness` capabilities and/or Core evaluation kinds.
 *
 * Adding a new skill = adding an entry here (or `register()` at runtime) +,
 * for harness-backed skills, a matching entry in `.harness/manifest.yaml`.
 */

import type { SkillDescriptor } from '../../domain/contracts/capability';

export const DEFAULT_SKILLS: readonly SkillDescriptor[] = [
  {
    id: 'validate-discovery-gate',
    description: 'Validate the Discovery phase gate (e.g. PRD readiness) for an initiative.',
    intents: ['validate_discovery_gate', 'validate_gate'],
    kind: 'composite', // .harness produces the facts, the Core evaluates them
    harnessCapability: 'sdlc-phase-gate-validator',
    evaluationKinds: ['gate'],
    permissions: ['read:repo', 'run:validator'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: true,
    policyRef: 'evolith.phase_gates',
  },
  {
    id: 'check-initiative-artifacts',
    description: 'Check whether an initiative has its mandatory artifacts present.',
    intents: ['check_initiative_artifacts', 'check_artifacts'],
    kind: 'evaluation',
    evaluationKinds: ['artifact'],
    permissions: ['read:repo'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: false,
  },
  {
    id: 'validate-adr-architecture',
    description: 'Validate an ADR against architecture rules/rulesets.',
    intents: ['validate_adr', 'validate_adr_architecture'],
    kind: 'composite',
    harnessCapability: 'adr-architecture-validator',
    evaluationKinds: ['architecture'],
    permissions: ['read:repo', 'run:validator'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: true,
    policyRef: 'evolith.capability_source_interface',
  },
  {
    id: 'run-opa-audit',
    description: 'Run an OPA/ruleset audit over the repository or a subject.',
    intents: ['run_opa_audit', 'audit_opa', 'audit_rulesets'],
    kind: 'harness',
    harnessCapability: 'opa-audit',
    permissions: ['read:repo', 'run:audit'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: false, // the audit IS the policy engine
  },
  {
    id: 'recommend-initiative-unblock',
    description: 'Generate recommendations to unblock a blocked initiative.',
    intents: ['recommend_unblock', 'recommend_initiative_unblock'],
    kind: 'evaluation',
    evaluationKinds: ['gate', 'compliance'],
    permissions: ['read:repo'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: false,
  },
  {
    id: 'publish-trace-event',
    description: 'Publish a trazability event to Evolith Tracker.',
    intents: ['publish_trace', 'emit_trace'],
    kind: 'harness',
    harnessCapability: 'emit-trace',
    permissions: ['write:trace'],
    requiresApproval: false,
    emitsTrace: true,
    requiresPolicy: false,
  },
];
