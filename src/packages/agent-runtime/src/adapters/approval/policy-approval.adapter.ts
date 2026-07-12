/**
 * Approval adapters for the HITL {@link IApprovalPort}.
 *
 * - {@link AutoApprovalAdapter}: DEV/TEST OPT-IN ONLY. Grants automatically
 *   UNLESS the capability is high-impact; useful for `agentic` mode in local
 *   dev / tests with low-risk capabilities. It never grants when the skill is
 *   flagged high-impact — that still needs a human. It is NOT wired as the
 *   production default: prod defaults to the real gate
 *   ({@link PendingApprovalAdapter}, GT-441) so nothing is silently auto-granted.
 * - {@link DenyByDefaultApprovalAdapter}: denies everything (safe default for
 *   `manual` mode / production until a real workflow is wired).
 *
 * A production deployment uses {@link PendingApprovalAdapter} (real
 * pending/approve/reject/expire, fail-closed) or a Tracker/Slack-backed
 * transport on top of it, without touching the runtime.
 */

import type { IApprovalPort, ApprovalDecision, ApprovalRequest } from '../../domain/ports/approval.port';

/** Permission scope that marks a capability as needing a real human. */
const HIGH_IMPACT_SCOPE = 'write:governed';

/**
 * @remarks DEV/TEST OPT-IN ONLY — auto-grants low-impact capabilities. Never use
 * as a production approval gate; prefer {@link PendingApprovalAdapter}.
 */
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
