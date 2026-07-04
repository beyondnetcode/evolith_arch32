# Agentic AI Incident Runbooks

> **Bilingual Navigation:** [Versión en Español](./runbooks.es.md)

These runbooks apply to every adopter of the Agentic AI topology. Preserve correlation evidence without collecting prompts, secrets, credentials, or unneeded personal data. Do not restore authority merely to continue an interrupted task.

## Agent Hang

**Trigger:** An execution exceeds its declared timeout, stops emitting expected progress, or holds MCP capacity without completing.

1. Stop new work for the affected capability and cancel its pending tool calls.
2. Preserve the correlation identifier, policy decisions, tool-call metadata, timeout, and resource counters.
3. Revoke the execution's delegated credential; do not reuse it for retry.
4. Inspect the last bounded action and dependency health. Correct the deterministic implementation, tool contract, or declared limit before retrying.
5. Resume with a new credential and reduced scope only after the tool owner approves the recovery.

## Token Overflow

**Trigger:** Prompt, completion, or combined context reaches its declared token ceiling, or preflight calculation predicts that it will.

1. Reject or cancel the execution before sending additional context to the model.
2. Preserve token counters, correlation evidence, and the approved context-source identifiers; do not log token content.
3. Remove nonessential, untrusted, or duplicate context and split the work into independently bounded steps.
4. Do not raise a budget during the incident. Any permanent budget change follows controlled change review and Native/OPA validation.
5. Retry only with a new preflight calculation that fits every declared ceiling.

## Unapproved Action

**Trigger:** A mutative tool is invoked, attempted, or reported as completed without recorded human or policy approval.

1. Disable the affected tool and capability immediately; cancel related work.
2. Revoke delegated credentials within the configured propagation limit and preserve append-only correlated evidence.
3. Determine whether the action executed. If it did, contain and reverse it through the owning system's approved recovery procedure.
4. Investigate the approval path, policy input, implementation, and tool audit trail. Treat missing evidence as an authorization failure.
5. Restore the tool only after the owner approves remediation and the changed contract, Native rule, OPA policy, and negative tests pass.

## Sandbox Escape

**Trigger:** The agent reaches an undeclared process, network destination, filesystem boundary, host capability, or privilege level.

1. Isolate the executor from network and tool access; stop all capabilities sharing its sandbox image or host boundary.
2. Revoke all credentials reachable from the executor and rotate credentials that may have been exposed.
3. Preserve the sandbox image, policy decision records, correlation evidence, and platform audit logs for investigation.
4. Rebuild from a known-good image, remove the escape path, and verify deny or allowlist controls before reconnecting it.
5. Require security-owner approval plus successful sandbox, Native, OPA, and negative-fixture validation before re-enabling work.

---
[Back to Operations Guide](./operations.md)
