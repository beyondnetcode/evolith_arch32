/**
 * IApprovalPort — Human-In-The-Loop gate for capabilities flagged
 * `requiresApproval`. The runtime cannot self-grant approval for governed
 * actions; it asks this port, which an adapter can satisfy via an auto-policy
 * (e.g. agentic mode + low risk), a caller-supplied token, or a real approval
 * workflow (chat/Tracker).
 */

import type { SkillDescriptor } from '../contracts/capability';
import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';

export interface ApprovalRequest {
  readonly skill: SkillDescriptor;
  readonly request: AgentRuntimeRequest;
}

export interface ApprovalDecision {
  readonly granted: boolean;
  readonly approver?: string;
  readonly reason?: string;
}

export interface IApprovalPort {
  requireApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
}
