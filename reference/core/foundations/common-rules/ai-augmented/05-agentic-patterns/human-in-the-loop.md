# Human-in-the-Loop: Mandatory Validation Points

## Definition and Objectives
The **Human-in-the-Loop (HITL)** pattern establishes forced barriers in the execution flow where the autonomous agent is compelled to pause its state and request explicit, physical human approval to continue.

Our architecture assumes that **NO AGENT IS 100% TRUSTWORTHY** in scenarios with ramifications in the physical or legal world.

## Which decisions ALWAYS require human approval?

In this corporate ecosystem, the following actions CANNOT be autonomous:

1. **Irreversible Destructive Operations:** Deleting production database records, massive subscription cancellations, deleting repositories.
2. **Infrastructure Configuration Changes (Production):** Modifying firewall rules, turning off load balancers, changing auto-scaling quotas.
3. **Signed External Communications:** Sending mass emails to real customers, publishing to corporate social media on behalf of the brand, sending binding commercial offers.
4. **Economic Transactions Over Threshold:** Any disbursement, money movement, or refund exceeding the configured `AUTO_APPROVAL_THRESHOLD` of each product.

## Implementation Patterns

### A. Interruption via Tool Callback
The harness intercepts the tool invocation before it is dispatched to the real backend:
1. Agent requests `execute_payment(amount: 5000)`.
2. Harness detects that `5000 > limit`.
3. Harness saves conversation state and sends a webhook to a Slack Approval Channel or admin panel.
4. Execution goes to sleep (`Suspended`).
5. Upon manual approval, the webhook wakes the harness and concludes the tool execution with the real result.

### B. Pre-Execution Plan Review
Used in conjunction with the Plan-and-Execute pattern. The Agent generates the list of 10 Bash commands it intends to run. The system renders the list to the developer, who must click "Approve and Execute" to proceed.

## Critical Anti-Pattern: The Illusion of Control
**Agents with unrestricted access to destructive tools relying solely on their System Prompt ("Please do not delete anything important") represent severe operational negligence.** Control MUST reside in the compiled code of the Harness, not in the textual intentions of the model.

---
[Back to Index](./README.md)
