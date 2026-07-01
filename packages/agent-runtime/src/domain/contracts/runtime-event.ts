import type { AgentRuntimeResult } from './agent-runtime-result';
import type { SkillDescriptor } from './capability';

export type RuntimeEventType = 
  | 'context_resolved'
  | 'capability_selected'
  | 'capability_not_found'
  | 'approval_required'
  | 'approval_decided'
  | 'approval_denied'
  | 'harness_started'
  | 'harness_executed'
  | 'evaluation_started'
  | 'evaluation_completed'
  | 'policy_validation_started'
  | 'policy_validated'
  | 'result_assembled'
  | 'error';

export interface RuntimeEvent {
  /** The type of event in the execution stream */
  type: RuntimeEventType;
  /** ISO timestamp */
  timestamp: string;
  /** The capability/skill in context, if resolved */
  capabilityId?: string;
  /** Arbitrary payload based on the event type (e.g., intermediate stdout, decision) */
  payload?: Record<string, unknown>;
  /** If the event is the final result, this field will be populated */
  result?: AgentRuntimeResult;
}
