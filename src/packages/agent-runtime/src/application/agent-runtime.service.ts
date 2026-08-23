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

import type { AssistantUsage } from '../domain/ports/assistant-invocation.port';
import type { IAgentRuntime } from '../domain/ports/agent-runtime.port';
import type { ISkillRegistryPort } from '../domain/ports/skill-registry.port';
import type { IHarnessPort } from '../domain/ports/harness.port';
import type { ICoreEvaluationPort } from '../domain/ports/core-evaluation.port';
import type { IPolicyValidationPort } from '../domain/ports/policy-validation.port';
import type { PolicyValidationResult } from '../domain/ports/policy-validation.port';
import type { ITrackerTracePort } from '../domain/ports/tracker-trace.port';
import type { IMemoryPort } from '../domain/ports/memory.port';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type {
  IAgentEnginePort,
  AgentEnginePlan,
  AgentPlanContext,
  AgentPlanHistoryEntry,
} from '../domain/ports/agent-engine.port';
import type { IKnowledgePort } from '../domain/ports/knowledge.port';
import type { IWorkspaceContextPort } from '../domain/ports/workspace-context.port';
import type { JournaledStep } from '../domain/ports/run-journal.port';

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
import { JournaledRun } from './run-journal';
import { mergeEngineArguments, type ArgumentMergeDecision } from './engine-argument-merge';
import { DEFAULT_MEMORY_HISTORY_LIMIT } from './agent-runtime-deps';
import {
  applyPolicy,
  assembleResult,
  fromEvaluation,
  fromHarness,
  mergeStatus,
} from './result-assembler';

// Re-export sub-interfaces for consumers that only need a subset (ISP)
export type {
  ExecutionDeps,
  GovernanceDeps,
  ObservabilityDeps,
  InfrastructureDeps,
  AgentRuntimeDeps,
} from './agent-runtime-deps';
import type { AgentRuntimeDeps } from './agent-runtime-deps';

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

      // 1-pre. GT-593 — open the step journal for this run. The run's identity IS
      // its correlationId: without one there is nothing to resume against, so a
      // request that wants resumability must correlate itself. Opening is safe
      // even after a `kill -9`; a partially-written tail is skipped by the adapter.
      const runId = request.context.correlationId;
      const journaled =
        this.deps.journal && runId
          ? await JournaledRun.open(this.deps.journal, runId, () => this.now())
          : undefined;
      if (journaled && journaled.priorEntries > 0) steps.push('resume-journal');

      // 1a. GT-612 — READ the conversation namespace BEFORE appending this turn,
      //     so the engine plans with the PRIOR turns and not with its own request
      //     echoed back. Bounded (default 20 entries ≈ 10 turns) and best-effort:
      //     a memory outage leaves the turn stateless, it never fails the run.
      //     Only paid for when an engine is wired — nothing else consumes it.
      let recalled: { entries: readonly AgentPlanHistoryEntry[]; limit: number } | undefined;
      const historyLimit = this.deps.memoryHistoryLimit ?? DEFAULT_MEMORY_HISTORY_LIMIT;
      if (this.deps.engine && historyLimit > 0) {
        steps.push('recall-conversation');
        try {
          const log = await this.deps.memory.history(this.conversationNs(request), historyLimit);
          recalled = { entries: log.map((e) => ({ at: e.at, value: e.value })), limit: historyLimit };
        } catch {
          // Recall is advisory; never block a governed run on a memory outage.
        }
      }

      await this.deps.memory.append(this.conversationNs(request), {
        kind: 'request',
        intent: request.intent,
        tool: request.tool,
        at: startedAt,
      });
      yield { type: 'context_resolved', timestamp: this.now() };

      // 1b. Ground: query the knowledge corpus BEFORE recommending (GT-541 / ADR-0090).
      //     Best-effort — a retrieval error NEVER fails the governed run; it just leaves
      //     the recommendation ungrounded. Records the cited chunks + the corpus_version
      //     they came from so the recommendation is traceable to the exact indexed corpus.
      let grounding: { corpusVersion?: string; citations: string[] } | undefined;
      if (this.deps.knowledge) {
        steps.push('ground');
        try {
          const knowledge = this.deps.knowledge;
          const groundInput = { query: request.intent, maxResults: 5 };
          // GT-593: retrieval is a non-deterministic step against a moving corpus.
          // Journaling it means a resumed run cites the SAME chunks the original
          // one did, instead of whatever the corpus happens to hold now.
          const grounded = await this.journalStep(journaled, 'ground', groundInput, () =>
            knowledge.query(groundInput),
          );
          const kr = grounded.value;
          const citations = kr.chunks.map((c) => (c.sectionHeading ? `${c.sourceFile}#${c.sectionHeading}` : c.sourceFile));
          const corpusVersion = kr.chunks.find((c) => c.corpusVersion)?.corpusVersion;
          grounding = { corpusVersion, citations };

          // ADR-0115 — feed the retrieval outcome to the knowledge-opportunity
          // detector. An intent that retrieved NOTHING is a question the corpus
          // cannot answer, and repeated it is a documented gap.
          //
          // GUARDED ON A NON-EMPTY CORPUS, and that guard is the whole point:
          // against an empty index every intent returns zero citations, so the
          // detector would report that everything is a knowledge gap. "No
          // answer" only carries meaning once there is a corpus that could have
          // answered. Until then we observe nothing rather than observe noise.
          // Not re-observed on a resume: the sensor already counted this intent on
          // the attempt that produced the journal entry, and counting it twice
          // would report a knowledge gap that widened only because a process died.
          if (this.deps.knowledgeOpportunity && kr.totalChunks > 0 && !grounded.resumed) {
            this.deps.knowledgeOpportunity.observe({
              intent: request.intent,
              citationCount: kr.chunks.length,
              corpusVersion,
              repository: request.context?.productId,
            });
          }
        } catch {
          // grounding is advisory; never block the run on a corpus outage.
        }
      }

      // 2. Select capability/tool. If unknown and an engine is available, let
      //    the engine PROPOSE a tool (still governed afterwards).
      steps.push('select-capability');
      let skill = await this.deps.skillRegistry.resolve(request.intent, request.tool);
      let enginePlanRationale: string | undefined;
      let assistantUsage: AssistantUsage | undefined;
      let enginePlan: AgentEnginePlan | undefined;

      if (!skill && this.deps.engine) {
        const engine = this.deps.engine;
        const skills = await this.deps.skillRegistry.list();
        const planContext: AgentPlanContext = {
          history: recalled?.entries,
          conversationNamespace: this.conversationNs(request),
        };
        // GT-593: the engine plan is THE non-deterministic step. Re-rolling it
        // after a crash means the audit record of what the agent decided depends
        // on when the process died, which is precisely what the journal fixes.
        enginePlan = (
          await this.journalStep(
            journaled,
            'engine-plan',
            {
              intent: request.intent,
              tool: request.tool,
              parameters: request.parameters,
              catalogue: skills.map((s) => s.id),
              history: recalled?.entries,
            },
            () => engine.plan(request, skills, planContext),
          )
        ).value;
        enginePlanRationale = `${enginePlan.engine}: ${enginePlan.rationale}`;
        // Se captura ANTES de decidir si la propuesta sirve: el proveedor ya cobro.
        assistantUsage = enginePlan.usage;
        if (enginePlan.proposedTool) {
          skill = await this.deps.skillRegistry.resolve(request.intent, enginePlan.proposedTool);
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

      // 2.4 GT-610 — the engine PROPOSED arguments; revalidate them and merge.
      //     Previously only `plan.proposedTool` was read and the capability ran
      //     with whatever `request.parameters` held: the right action, recorded,
      //     executed with the wrong inputs. The engine is an untrusted source, so
      //     nothing is passed through unchecked — the caller stays authoritative,
      //     a declared input contract is enforced, and the decision is traced.
      //     `governedRequest` is what every downstream step executes with.
      let governedRequest = request;
      let argumentDecision: ArgumentMergeDecision | undefined;
      if (enginePlan?.proposedArguments) {
        steps.push('merge-engine-arguments');
        const merge = mergeEngineArguments({
          caller: request.parameters,
          proposed: enginePlan.proposedArguments,
          skill,
          engine: enginePlan.engine,
          policy: this.deps.engineArgumentPolicy,
        });
        argumentDecision = merge.decision;
        if (merge.decision.source === 'engine-merged') {
          governedRequest = { ...request, parameters: merge.parameters };
        }
        await this.emit(request, skill, 'capability.resolved', undefined, {
          argumentSource: merge.decision.source,
          engine: merge.decision.engine,
          contract: merge.decision.contract,
          acceptedArguments: merge.decision.accepted,
          rejectedArguments: merge.decision.rejected,
        });
      }

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
        const policy = await this.validatePolicy(governedRequest, skill, { stage: 'pre-execution' });
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
        const harnessRequest = {
          capability: skill.harnessCapability ?? skill.id,
          // GT-610: the REVALIDATED argument set, not the raw request parameters.
          args: governedRequest.parameters,
          context: governedRequest.context,
          dryRun: governedRequest.dryRun,
        };
        // GT-593: a completed execution is replayed rather than re-run. A step
        // killed BEFORE it completed left no entry and is re-executed whole — the
        // journal records outcomes, it does not make a capability idempotent.
        harnessResult = (
          await this.journalStep(journaled, 'harness-execute', harnessRequest, () =>
            this.deps.harness.execute(harnessRequest),
          )
        ).value;
        await this.emit(request, skill, 'harness.executed', harnessResult.ok ? 'passed' : 'blocked', {
          capability: harnessResult.capability,
          exitCode: harnessResult.exitCode,
        });
        yield { type: 'harness_executed', timestamp: this.now(), capabilityId: skill.id, payload: { exitCode: harnessResult.exitCode, ok: harnessResult.ok } };
      }

      if (skill.kind === 'evaluation' || skill.kind === 'composite') {
        // GT-438: assemble the REAL workspace so the stateless Core evaluates
        // actual content INLINE instead of an empty context (empty ⇒ GOV-000
        // "nothing to evaluate"). Best-effort — a workspace outage must not fail
        // the governed run; it just leaves the evaluation ungrounded (prior flow).
        let workspaceFiles: Readonly<Record<string, string>> | undefined;
        if (this.deps.workspaceContext) {
          steps.push('assemble-workspace');
          try {
            const assembled = await this.deps.workspaceContext.assemble({
              workspaceRef: request.context.workspaceRef,
              phase: request.context.phase,
              correlationId: request.context.correlationId,
              passthrough: request.context.passthrough,
            });
            if (assembled.files && Object.keys(assembled.files).length > 0) {
              workspaceFiles = assembled.files;
            }
          } catch {
            // Assembly is advisory; never block the run on a workspace read error.
          }
        }

        steps.push('core-evaluate');
        yield { type: 'evaluation_started', timestamp: this.now(), capabilityId: skill.id };
        const evalCtx = buildEvaluationContext(governedRequest, skill, harnessResult?.data, workspaceFiles);
        // GT-593: the Core is stateless, so replaying its verdict for an identical
        // context is sound — and it preserves the verdict the run originally got
        // even if a ruleset changed between the crash and the resume.
        evaluation = (
          await this.journalStep(journaled, 'core-evaluate', evalCtx, () =>
            this.deps.coreEvaluation.evaluate(evalCtx),
          )
        ).value;
        await this.emit(request, skill, 'core.evaluated', undefined, {
          verdict: String(evaluation.overallVerdict),
          outcome: evaluation.outcome,
          workspaceFiles: workspaceFiles ? Object.keys(workspaceFiles).length : 0,
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
        const policy = await this.validatePolicy(governedRequest, skill, {
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
        groundedBy: grounding,
        // GT-610 / GT-612: which argument set ran, and how much prior
        // conversation informed the plan.
        argumentSource: argumentDecision,
        recalledMemory: recalled
          ? {
              namespace: this.conversationNs(request),
              entries: recalled.entries.length,
              limit: recalled.limit,
            }
          : undefined,
        // GT-593 — which steps were replayed from the journal and which ran.
        resumedFrom:
          journaled && runId
            ? {
                runId,
                priorEntries: journaled.priorEntries,
                resumed: [...journaled.resumedSteps],
                recorded: [...journaled.recordedSteps],
              }
            : undefined,
      };

      const recommendations: RuntimeRecommendation[] = enginePlanRationale
        ? [{ id: 'engine-plan', message: enginePlanRationale }, ...parts.recommendations]
        : parts.recommendations;

      const result = assembleResult({
        assistantUsage,
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

  /**
   * GT-593 — run a step through the journal when one is open, or plainly when it
   * is not. Keeping the fallback here (rather than at every call site) means the
   * pipeline reads identically whether or not resumability is wired, and the
   * un-journaled path keeps its exact previous behaviour.
   */
  private async journalStep<T>(
    run: JournaledRun | undefined,
    step: JournaledStep,
    input: unknown,
    execute: () => Promise<T>,
  ): Promise<{ value: T; resumed: boolean }> {
    if (!run) return { value: await execute(), resumed: false };
    return run.step(step, input, execute);
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
