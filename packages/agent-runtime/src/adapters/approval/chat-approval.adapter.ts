import type { IApprovalPort, ApprovalRequest, ApprovalResult } from '../../domain/ports/approval.port';

/**
 * GT-387: Chat-based HITL approval adapter.
 *
 * Simulates human approval via console interaction for development/testing.
 * In production, this would be replaced by a real chat/Tracker approval
 * workflow that sends a notification and waits for human response.
 *
 * Design rule #5: the package must work with this stub when no external
 * approval system is configured.
 */
export class ChatApprovalAdapter implements IApprovalPort {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    // In a real implementation, this would:
    // 1. Send approval request to chat/Tracker
    // 2. Wait for human response
    // 3. Return the approval decision

    console.log(`[GT-387] Approval requested for capability '${request.capabilityId}':`);
    console.log(`  Reason: ${request.reason}`);
    console.log(`  Auto-approving in dev mode (no external approval system configured).`);

    return {
      granted: true,
      approver: 'chat-approval-adapter-dev',
      reason: 'Auto-approved in development mode',
      timestamp: new Date().toISOString(),
    };
  }
}
