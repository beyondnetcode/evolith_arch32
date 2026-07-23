/**
 * Agent Runtime Dependencies — ISP-compliant sub-interfaces.
 *
 * The original AgentRuntimeDeps had 13 properties, violating the Interface
 * Segregation Principle. Consumers wanting to test or use a subset had to
 * provide all 13 dependencies.
 *
 * Split into 4 focused sub-interfaces:
 * - ExecutionDeps: engine, harness, skillRegistry
 * - GovernanceDeps: policy, coreEvaluation, approval
 * - ObservabilityDeps: tracker, memory, knowledge
 * - InfrastructureDeps: workspaceContext, clock, id generator
 *
 * AgentRuntimeDeps extends all four for backward compatibility.
 */

import type { ISkillRegistryPort } from '../domain/ports/skill-registry.port';
import type { IHarnessPort } from '../domain/ports/harness.port';
import type { ICoreEvaluationPort } from '../domain/ports/core-evaluation.port';
import type { IPolicyValidationPort } from '../domain/ports/policy-validation.port';
import type { ITrackerTracePort } from '../domain/ports/tracker-trace.port';
import type { IMemoryPort } from '../domain/ports/memory.port';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { IAgentEnginePort } from '../domain/ports/agent-engine.port';
import type { IKnowledgePort } from '../domain/ports/knowledge.port';
import type { IWorkspaceContextPort } from '../domain/ports/workspace-context.port';

/** Execution concerns: engine, harness, skill registry. */
export interface ExecutionDeps {
  readonly skillRegistry: ISkillRegistryPort;
  readonly harness: IHarnessPort;
  /** Optional reasoning engine (Hermes adapter, stub, or none). */
  readonly engine?: IAgentEnginePort;
}

/** Governance concerns: policy validation, core evaluation, approval. */
export interface GovernanceDeps {
  readonly coreEvaluation: ICoreEvaluationPort;
  readonly policy: IPolicyValidationPort;
  readonly approval: IApprovalPort;
}

/** Observability concerns: tracing, memory, knowledge. */
export interface ObservabilityDeps {
  readonly tracker: ITrackerTracePort;
  readonly memory: IMemoryPort;
  /** Optional read-side knowledge/RAG port. */
  readonly knowledge?: IKnowledgePort;
  /** Optional sensor fed by the `ground` step. */
  readonly knowledgeOpportunity?: { observe(o: { intent: string; citationCount: number; corpusVersion?: string; repository?: string }): void };
}

/** Infrastructure concerns: workspace context, clock, id generator. */
export interface InfrastructureDeps {
  /** Optional workspace-context assembler for inline evaluation. */
  readonly workspaceContext?: IWorkspaceContextPort;
  /** Injected clock for deterministic tests. */
  readonly now?: () => string;
  /** Injected id generator for deterministic tests. */
  readonly id?: () => string;
}

/** Full runtime dependencies — extends all sub-interfaces for backward compatibility. */
export interface AgentRuntimeDeps extends ExecutionDeps, GovernanceDeps, ObservabilityDeps, InfrastructureDeps {}
