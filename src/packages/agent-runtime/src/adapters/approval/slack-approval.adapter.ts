import type { IApprovalPort, ApprovalRequest, ApprovalDecision } from '../../domain/ports/approval.port';

/**
 * GT-406: Slack approval adapter stub.
 *
 * Placeholder for Slack-based HITL approval. When the Slack integration
 * is configured, this adapter sends an approval request to a Slack channel
 * and waits for a human response via interactive message actions.
 *
 * Currently auto-approves in dev mode.
 */
export class SlackApprovalAdapter implements IApprovalPort {
  constructor(private readonly webhookUrl?: string) {}

  async requireApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    if (!this.webhookUrl) {
      console.log(`[GT-406] Slack approval stub: auto-approving '${request.skill.id}' (no webhook configured)`);
      return {
        granted: true,
        approver: 'slack-approval-stub',
        reason: 'Auto-approved: Slack webhook not configured',
      };
    }

    // Production: POST to Slack webhook, wait for interactive response
    throw new Error('Slack approval adapter: production implementation not yet wired');
  }
}
