/**
 * Pure mappers from the runtime's request/context into the canonical Core
 * Evaluation contract and the OPA policy input. Kept side-effect free so they
 * are trivially unit-testable and carry NO runtime dependency on core-domain
 * (type-only imports — the hexagon stays clean).
 */

import type {
  EvaluationContext,
  EvaluationResult,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type { HarnessExecutionResult } from '../domain/ports/harness.port';

/** Canonical phase ids (must mirror core-domain GatePhase). */
const CANONICAL_PHASES = ['discovery', 'design', 'construction', 'qa', 'release'] as const;

type PhaseIdT = NonNullable<EvaluationContext['phaseId']>;
type EvaluationKindT = EvaluationContext['kinds'][number];

/** Narrow a free-form phase string to a canonical PhaseId, else undefined. */
export function toPhaseId(phase?: string): PhaseIdT | undefined {
  if (!phase) return undefined;
  const v = phase.trim().toLowerCase();
  return (CANONICAL_PHASES as readonly string[]).includes(v) ? (v as PhaseIdT) : undefined;
}

const KNOWN_KINDS: readonly string[] = [
  'gate', 'artifact', 'evidence', 'architecture', 'blueprint',
  'topology', 'checkpoint', 'deployment', 'rule', 'compliance',
];

/** Build a canonical EvaluationContext from a runtime request + resolved skill. */
export function buildEvaluationContext(
  request: AgentRuntimeRequest,
  skill: SkillDescriptor,
  harnessData?: Readonly<Record<string, unknown>>,
): EvaluationContext {
  const ctx = request.context;
  const kinds = (skill.evaluationKinds ?? ['gate'])
    .filter((k) => KNOWN_KINDS.includes(k))
    .map((k) => k as EvaluationKindT);

  return {
    kinds: kinds.length > 0 ? kinds : (['gate'] as readonly EvaluationKindT[]),
    tenant: ctx.tenantId ? { tenantId: ctx.tenantId } : undefined,
    product: ctx.productId ? { productId: ctx.productId, tenantId: ctx.tenantId } : undefined,
    initiative: ctx.initiativeId
      ? { initiativeId: ctx.initiativeId, productId: ctx.productId, tenantId: ctx.tenantId }
      : undefined,
    phaseId: toPhaseId(ctx.phase),
    gateId: ctx.gate,
    workspaceRef: ctx.workspaceRef,
    rulesetRef: ctx.rulesetRef,
    rulesetVersion: ctx.rulesetVersion,
    policyRefs: ctx.policyRefs,
    executionMode: ctx.executionMode,
    correlationId: ctx.correlationId,
    // Harness facts + caller parameters travel as opaque passthrough; the Core
    // never scans disk — it evaluates the declared facts it is given.
    passthrough: { ...(ctx.passthrough ?? {}), ...(request.parameters ?? {}), ...(harnessData ?? {}) },
  };
}

/** Build the OPA policy input document from whatever the capability produced. */
export function buildPolicyInput(
  request: AgentRuntimeRequest,
  skill: SkillDescriptor,
  output: { harness?: HarnessExecutionResult; evaluation?: EvaluationResult },
): Record<string, unknown> {
  return {
    intent: request.intent,
    tool: skill.id,
    sourceInterface: request.sourceInterface,
    context: request.context,
    capability: {
      id: skill.id,
      kind: skill.kind,
      permissions: skill.permissions,
      requiresApproval: skill.requiresApproval,
      emitsTrace: skill.emitsTrace,
      requiresPolicy: skill.requiresPolicy,
      policyRef: skill.policyRef,
      allowedSourceInterfaces: skill.allowedSourceInterfaces,
    },
    tenant: request.context.tenantId,
    product: request.context.productId,
    initiative: request.context.initiativeId,
    phase: request.context.phase,
    gate: request.context.gate,
    harness: output.harness?.data ?? null,
    evaluation: output.evaluation
      ? { verdict: String(output.evaluation.overallVerdict), outcome: output.evaluation.outcome }
      : null,
  };
}
