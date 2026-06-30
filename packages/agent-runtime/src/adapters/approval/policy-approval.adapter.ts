/**
 * Approval adapters for the HITL {@link IApprovalPort}.
 *
 * - {@link AutoApprovalAdapter}: grants automatically UNLESS the capability is
 *   high-impact; useful for `agentic` mode with low-risk capabilities. It never
 *   grants when the skill is flagged high-impact — that still needs a human.
 * - {@link DenyByDefaultApprovalAdapter}: denies everything (safe default for
 *   `manual` mode / production until a real workflow is wired).
 *
 * A production deployment swaps these for a chat/Tracker approval workflow
 * without touching the runtime.
 */

import type { IApprovalPort, ApprovalDecision, ApprovalRequest } from '../../domain/ports/approval.port';

/** Permission scope that marks a capability as needing a real human. */
const HIGH_IMPACT_SCOPE = 'write:governed';

export class AutoApprovalAdapter implements IApprovalPort {
  constructor(private readonly approver = 'auto:agent_runtime') {}

  async requireApproval(req: ApprovalRequest): Promise<ApprovalDecision> {
    const highImpact = req.skill.permissions.includes(HIGH_IMPACT_SCOPE);
    if (highImpact) {
      return { granted: false, reason: 'High-impact capability requires human approval.' };
    }
    return { granted: true, approver: this.approver, reason: 'Auto-approved (low-impact, agentic mode).' };
  }
}

export class DenyByDefaultApprovalAdapter implements IApprovalPort {
  async requireApproval(): Promise<ApprovalDecision> {
    return { granted: false, reason: 'No approval workflow configured; denied by default.' };
  }
}
