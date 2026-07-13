/**
 * AgentRuntimeService — the orchestration heart of the Evolith Agent Runtime.
 *
 * It implements the base flow from the design brief:
 *   receive AgentRuntimeRequest
 *     → resolve tenant/product/initiative context
 *     → select capability/tool (SkillRegistry; optionally engine-proposed)
 *     → run policy preflight (OPA) when required
 *     → enforce approval (HITL) when required
 *     → invoke ports (.harness execute → Core evaluate)
 *     → run policy validation (OPA) when required
 *     → assemble AgentRuntimeResult
 *     → emit trazability (Tracker + Memory)
 *
 * It depends ONLY on ports. No adapter, no framework, and crucially no engine
 * (Hermes) type leaks in here — the engine is an optional injected port.
 */

import type { IAgentRuntime } from '../domain/ports/agent-runtime.port';
import type { ISkillRegistryPort } from '../domain/ports/skill-registry.port';
import type { IHarnessPort } from '../domain/ports/harness.port';
import type { ICoreEvaluationPort } from '../domain/ports/core-evaluation.port';
import type { IPolicyValidationPort } from '../domain/ports/policy-validation.port';
import type { PolicyValidationResult } from '../domain/ports/policy-validation.port';
import type { ITrackerTracePort } from '../domain/ports/tracker-trace.port';
import type { IMemoryPort } from '../domain/ports/memory.port';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { IAgentEnginePort } from '../domain/ports/agent-engine.port';
import type { IKnowledgePort } from '../domain/ports/knowledge.port';

import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type {
  AgentRuntimeResult,
  RuntimeFinding,
  RuntimeRecommendation,
  RuntimeStatus,
  RuntimeTrace,
} from '../domain/contracts/agent-runtime-result';
import type { RuntimeEvent } from '../domain/contracts/runtime-event';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type { TraceEvent, TraceEventType } from '../domain/contracts/trace';
import type { HarnessExecutionResult } from '../domain/ports/harness.port';
import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation/contracts';

import { buildEvaluationContext, buildPolicyInput } from './context-mapper';
import {
  applyPolicy,
  assembleResult,
  fromEvaluation,
  fromHarness,
  mergeStatus,
} from './result-assembler';

/** Ports the service depends on. Engine is OPTIONAL (works with no LLM at all). */
export interface AgentRuntimeDeps {
  readonly skillRegistry: ISkillRegistryPort;
  readonly harness: IHarnessPort;
  readonly coreEvaluation: ICoreEvaluationPort;
  readonly policy: IPolicyValidationPort;
  readonly tracker: ITrackerTracePort;
  readonly memory: IMemoryPort;
  readonly approval: IApprovalPort;
  /** Optional reasoning engine (Hermes adapter, stub, or none). */
  readonly engine?: IAgentEnginePort;
  /**
   * Optional read-side knowledge/RAG port (GT-408 in-memory default, GT-540
   * pgvector in production). Carried on the bundle so grounded retrieval is
   * reachable; the base flow itself does not depend on it.
   */
  readonly knowledge?: IKnowledgePort;
  /** Injected clock for deterministic tests. */
  readonly now?: () => string;
  /** Injected id generator for deterministic tests. */
  readonly id?: () => string;
}

const RUNTIME_ACTOR = 'agent_runtime';

export class AgentRuntimeService implements IAgentRuntime {
  private seq = 0;

  constructor(private readonly deps: AgentRuntimeDeps) {}

  private now(): string {
    return this.deps.now ? this.deps.now() : new Date().toISOString();
  }

  private nextId(prefix: string): string {
    if (this.deps.id) return this.deps.id();
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  async handle(request: AgentRuntimeRequest): Promise<AgentRuntimeResult> {
    let result: AgentRuntimeResult | undefined;
    
    // Consume the stream, discard intermediate events, return final result
    for await (const event of this.handleStream(request)) {
      if (event.type === 'result_assembled' || event.type === 'error') {
        result = event.result;
      }
    }

    if (!result) {
      throw new Error('Stream ended without a final result');
    }
    
    return result;
  }

  async *handleStream(request: AgentRuntimeRequest): AsyncGenerator<RuntimeEvent, void> {
    const startedAt = this.now();
    const steps: string[] = [];
    const baseTrace = (): RuntimeTrace => ({
      executedBy: RUNTIME_ACTOR,
      capability: undefined,
      correlationId: request.context.correlationId,
      tenantId: request.context.tenantId,
      productId: request.context.productId,
      initiativeId: request.context.initiativeId,
      steps: [...steps],
    });

    try {
      // 1. Resolve context (already in request.context) + record in memory.
      steps.push('resolve-context');
      await this.deps.memory.append(this.conversationNs(request), {
        kind: 'request',
        intent: request.intent,
        tool: request.tool,
        at: startedAt,
      });
      yield { type: 'context_resolved', timestamp: this.now() };

      // 2. Select capability/tool. If unknown and an engine is available, let
      //    the engine PROPOSE a tool (still governed afterwards).
      steps.push('select-capability');
      let skill = await this.deps.skillRegistry.resolve(request.intent, request.tool);
      let enginePlanRationale: string | undefined;

      if (!skill && this.deps.engine) {
        const skills = await this.deps.skillRegistry.list();
        const plan = await this.deps.engine.plan(request, skills);
        enginePlanRationale = `${plan.engine}: ${plan.rationale}`;
        if (plan.proposedTool) {
          skill = await this.deps.skillRegistry.resolve(request.intent, plan.proposedTool);
        }
      }

      if (!skill) {
        steps.push('tool-not-found');
        yield { type: 'capability_not_found', timestamp: this.now() };
        
        let msg = `No capability resolves intent '${request.intent}'${request.tool ? ` / tool '${request.tool}'` : ''}.`;
        if (!this.deps.engine && (request.sourceInterface === 'smart_cli_chat' || request.sourceInterface === 'hermes_agent_chatbox' || request.sourceInterface === 'future_chat_adapter')) {
           msg += ' (Agent engine is not enabled/installed, so conversational intents cannot be interpreted)';
        }
        
        const result = await this.fail(
          request,
          baseTrace(),
          startedAt,
          msg,
          'tool-not-found',
        );
        yield { type: 'error', timestamp: this.now(), result };
        return;
      }
      
      yield { type: 'capability_selected', timestamp: this.now(), capabilityId: skill.id };

      // 2.5 Validate interface permissions
      if (skill.allowedSourceInterfaces && request.sourceInterface && !skill.allowedSourceInterfaces.includes(request.sourceInterface)) {
        steps.push('blocked-by-interface');
        const result = await this.blocked(
          request,
          skill,
          { ...baseTrace(), capability: skill.id },
          startedAt,
          `Capability '${skill.id}' is not allowed to be executed from interface '${request.sourceInterface}'.`
        );
        yield { type: 'result_assembled', timestamp: this.now(), result };
        return;
      }

      // 3. Policy preflight (OPA) before approval or capability execution.
      if (skill.requiresPolicy) {
        steps.push('policy-preflight');
        yield {
          type: 'policy_validation_started',
          timestamp: this.now(),
          capabilityId: skill.id,
          payload: { stage: 'pre-execution' },
        };
        const policy = await this.validatePolicy(request, skill, { stage: 'pre-execution' });
        await this.emit(request, skill, 'policy.validated', policy.allowed ? 'passed' : 'blocked', {
          policyRef: policy.policyRef,
          violations: policy.violations.length,
          stage: 'pre-execution',
        });
        yield {
          type: 'policy_validated',
          timestamp: this.now(),
          capabilityId: skill.id,
          payload: { allowed: policy.allowed, violations: policy.violations.length, stage: 'pre-execution' },
        };

        if (!policy.allowed) {
          const result = this.policyBlockedResult(request, skill, baseTrace(), startedAt, policy);
          yield { type: 'result_assembled', timestamp: this.now(), result };
          return;
        }
      }

      // 4. Approval (HITL) when the capability requires it.
      let approvedBy: string | undefined;
      if (skill.requiresApproval) {
        steps.push('approval');
        yield { type: 'approval_required', timestamp: this.now(), capabilityId: skill.id };
        const decision = request.approval?.granted
          ? { granted: true, approver: request.approval.approver }
          : await this.deps.approval.requireApproval({ skill, request });

        await this.emit(request, skill, 'approval.decided', decision.granted ? 'warning' : 'blocked', {
          approver: decision.approver,
        });

        if (!decision.granted) {
          steps.push('approval-denied');
          yield { type: 'approval_denied', timestamp: this.now(), capabilityId: skill.id, payload: { approver: decision.approver } };
          const result = await this.blocked(
            request,
            skill,
            { ...baseTrace(), capability: skill.id },
            startedAt,
            `Capability '${skill.id}' requires human approval; not granted.`,
          );
          yield { type: 'result_assembled', timestamp: this.now(), result };
          return;
        }
        
        yield { type: 'approval_decided', timestamp: this.now(), capabilityId: skill.id, payload: { approver: decision.approver } };
        approvedBy = decision.approver;
      }

      // 5. Invoke ports based on the capability kind.
      let harnessResult: HarnessExecutionResult | undefined;
      let evaluation: EvaluationResult | undefined;

      if (skill.kind === 'harness' || skill.kind === 'composite') {
        steps.push('harness-execute');
        yield { type: 'harness_started', timestamp: this.now(), capabilityId: skill.id };
        harnessResult = await this.deps.harness.execute({
          capability: skill.harnessCapability ?? skill.id,
          args: request.parameters,
          context: request.context,
          dryRun: request.dryRun,
        });
        await this.emit(request, skill, 'harness.executed', harnessResult.ok ? 'passed' : 'blocked', {
          capability: harnessResult.capability,
          exitCode: harnessResult.exitCode,
        });
        yield { type: 'harness_executed', timestamp: this.now(), capabilityId: skill.id, payload: { exitCode: harnessResult.exitCode, ok: harnessResult.ok } };
      }

      if (skill.kind === 'evaluation' || skill.kind === 'composite') {
        steps.push('core-evaluate');
        yield { type: 'evaluation_started', timestamp: this.now(), capabilityId: skill.id };
        const evalCtx = buildEvaluationContext(request, skill, harnessResult?.data);
        evaluation = await this.deps.coreEvaluation.evaluate(evalCtx);
        await this.emit(request, skill, 'core.evaluated', undefined, {
          verdict: String(evaluation.overallVerdict),
          outcome: evaluation.outcome,
        });
        yield { type: 'evaluation_completed', timestamp: this.now(), capabilityId: skill.id, payload: { verdict: String(evaluation.overallVerdict), outcome: evaluation.outcome } };
      }

      // 6. Assemble base parts from whatever ran.
      let parts = this.combine(harnessResult, evaluation);

      // 7. Policy validation (OPA) when required, using execution output.
      if (skill.requiresPolicy) {
        steps.push('policy-validate');
        yield {
          type: 'policy_validation_started',
          timestamp: this.now(),
          capabilityId: skill.id,
          payload: { stage: 'post-execution' },
        };
        const policy = await this.validatePolicy(request, skill, {
          stage: 'post-execution',
          harness: harnessResult,
          evaluation,
        });
        parts = applyPolicy(parts, policy);
        await this.emit(request, skill, 'policy.validated', policy.allowed ? 'passed' : 'blocked', {
          policyRef: policy.policyRef,
          violations: policy.violations.length,
          stage: 'post-execution',
        });
        yield {
          type: 'policy_validated',
          timestamp: this.now(),
          capabilityId: skill.id,
          payload: { allowed: policy.allowed, violations: policy.violations.length, stage: 'post-execution' },
        };
      }

      // 8. Assemble final result + provenance trace.
      const finishedAt = this.now();
      const trace: RuntimeTrace = {
        executedBy: RUNTIME_ACTOR,
        validatedBy: harnessResult ? '.harness' : undefined,
        governedBy: evaluation ? 'evolith_core' : undefined,
        policyEngine: skill.requiresPolicy ? 'opa' : 'none',
        capability: skill.id,
        correlationId: request.context.correlationId,
        tenantId: request.context.tenantId,
        productId: request.context.productId,
        initiativeId: request.context.initiativeId,
        approvedBy,
        durationMs: this.duration(startedAt, finishedAt),
        steps: [...steps, 'completed'],
      };

      const recommendations: RuntimeRecommendation[] = enginePlanRationale
        ? [{ id: 'engine-plan', message: enginePlanRationale }, ...parts.recommendations]
        : parts.recommendations;

      const result = assembleResult({
        parts: { ...parts, recommendations },
        trace,
        evaluatedAt: finishedAt,
        raw: {
          harness: harnessResult ?? null,
          evaluation: evaluation ? { verdict: String(evaluation.overallVerdict) } : null,
        },
      });

      // 9. Trazability: completed event + memory.
      await this.emit(request, skill, 'runtime.completed', result.status, undefined, trace);
      await this.deps.memory.append(this.conversationNs(request), {
        kind: 'result',
        status: result.status,
        at: finishedAt,
      });

      yield { type: 'result_assembled', timestamp: this.now(), result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push('exception');
      const result = await this.fail(request, baseTrace(), startedAt, `Runtime failure: ${message}`, 'exception');
      yield { type: 'error', timestamp: this.now(), result };
    }
  }

  private combine(
    harness: HarnessExecutionResult | undefined,
    evaluation: EvaluationResult | undefined,
  ): {
    status: RuntimeStatus;
    findings: RuntimeFinding[];
    recommendations: RuntimeRecommendation[];
    missingArtifacts: string[];
  } {
    const h = harness ? fromHarness(harness) : undefined;
    const e = evaluation ? fromEvaluation(evaluation) : undefined;
    if (h && e) {
      return {
        status: mergeStatus(h.status, e.status),
        findings: [...h.findings, ...e.findings],
        recommendations: [...h.recommendations, ...e.recommendations],
        // Both layers independently flag missing artifacts; dedupe the union so
        // the consumer sees each artifact once (findings stay per-source).
        missingArtifacts: [...new Set([...h.missingArtifacts, ...e.missingArtifacts])],
      };
    }
    return (
      h ??
      e ?? { status: 'passed' as RuntimeStatus, findings: [], recommendations: [], missingArtifacts: [] }
    );
  }

  private validatePolicy(
    request: AgentRuntimeRequest,
    skill: SkillDescriptor,
    output: {
      stage: 'pre-execution' | 'post-execution';
      harness?: HarnessExecutionResult;
      evaluation?: EvaluationResult;
    },
  ): Promise<PolicyValidationResult> {
    return this.deps.policy.validate({
      policyRef: skill.policyRef,
      input: {
        ...buildPolicyInput(request, skill, { harness: output.harness, evaluation: output.evaluation }),
        policyStage: output.stage,
      },
      context: request.context,
    });
  }

  private policyBlockedResult(
    request: AgentRuntimeRequest,
    skill: SkillDescriptor,
    trace: RuntimeTrace,
    startedAt: string,
    policy: PolicyValidationResult,
  ): AgentRuntimeResult {
    const finishedAt = this.now();
    const parts = applyPolicy(
      { status: 'passed' as RuntimeStatus, findings: [], recommendations: [], missingArtifacts: [] },
      policy,
    );
    return assembleResult({
      parts,
      trace: {
        ...trace,
        capability: skill.id,
        policyEngine: 'opa',
        durationMs: this.duration(startedAt, finishedAt),
        steps: [...(trace.steps ?? []), 'blocked-by-policy-preflight'],
      },
      evaluatedAt: finishedAt,
      summary: `Capability '${skill.id}' blocked by policy preflight.`,
      raw: {
        policy: {
          allowed: policy.allowed,
          violations: policy.violations.length,
          stage: 'pre-execution',
        },
      },
    });
  }

  private async blocked(
    request: AgentRuntimeRequest,
    skill: SkillDescriptor,
    trace: RuntimeTrace,
    startedAt: string,
    summary: string,
  ): Promise<AgentRuntimeResult> {
    const finishedAt = this.now();
    const result = assembleResult({
      parts: { status: 'blocked', findings: [], recommendations: [], missingArtifacts: [] },
      trace: { ...trace, durationMs: this.duration(startedAt, finishedAt) },
      evaluatedAt: finishedAt,
      summary,
    });
    await this.emit(request, skill, 'capability.blocked', 'blocked');
    return result;
  }

  private async fail(
    request: AgentRuntimeRequest,
    trace: RuntimeTrace,
    startedAt: string,
    summary: string,
    _reason: string,
  ): Promise<AgentRuntimeResult> {
    const finishedAt = this.now();
    const result = assembleResult({
      parts: { status: 'error', findings: [], recommendations: [], missingArtifacts: [] },
      trace: { ...trace, durationMs: this.duration(startedAt, finishedAt) },
      evaluatedAt: finishedAt,
      summary,
    });
    await this.safePublish({
      id: this.nextId('evt'),
      type: 'runtime.failed',
      occurredAt: finishedAt,
      intent: request.intent,
      status: 'error',
      tenantId: request.context.tenantId,
      productId: request.context.productId,
      initiativeId: request.context.initiativeId,
      correlationId: request.context.correlationId,
      provenance: result.trace,
    });
    return result;
  }

  private async emit(
    request: AgentRuntimeRequest,
    skill: SkillDescriptor | undefined,
    type: TraceEventType,
    status?: RuntimeStatus,
    payload?: Record<string, unknown>,
    provenance?: RuntimeTrace,
  ): Promise<void> {
    // Respect the capability's declared trazability flag (design rule #5/#6):
    // non-tracing capabilities still log lifecycle events but skip Tracker.
    if (skill && skill.emitsTrace === false) return;
    const event: TraceEvent = {
      id: this.nextId('evt'),
      type,
      occurredAt: this.now(),
      intent: request.intent,
      capability: skill?.id,
      status,
      tenantId: request.context.tenantId,
      productId: request.context.productId,
      initiativeId: request.context.initiativeId,
      correlationId: request.context.correlationId,
      provenance,
      payload,
    };
    await this.safePublish(event);
  }

  private async safePublish(event: TraceEvent): Promise<void> {
    try {
      await this.deps.tracker.publish(event);
    } catch {
      // Trazability delivery is best-effort and must never block a governed
      // result; swallow here (adapters log their own failures).
    }
  }

  private conversationNs(request: AgentRuntimeRequest): string {
    return `conv:${request.context.correlationId ?? request.context.initiativeId ?? 'default'}`;
  }

  private duration(startIso: string, endIso: string): number | undefined {
    const a = Date.parse(startIso);
    const b = Date.parse(endIso);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : undefined;
  }
}
