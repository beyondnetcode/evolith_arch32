# Agentic AI Operations Guide

> **Bilingual Navigation:** [Version en Espanol](./operations.es.md)

## Operating Model

Operate each agent as an identifiable workload with a declared configuration, versioned deterministic implementation, bounded capability set, and accountable tool owner. Deploy configuration and implementation together so the evaluated contract identifies the code and tools that actually execute.

## Observability and Evidence

Record a correlation identifier for every request, context acquisition, policy decision, approval decision, tool call, result, cancellation, and denial. Evidence must be append-only and sufficient to reconstruct which identity, capability, policy, and approver authorized an action without recording secrets or unnecessary personal data.

## Change Management

Treat a new tool, capability, context source, network destination, or mutative behavior as a controlled change. Revalidate Native and OPA policy, run the negative fixtures, review the affected ADRs, and obtain the tool owner's approval before promotion. A prompt-only change cannot bypass this review when it changes requested authority.

## Incident Handling

Disable the affected capability or tool first, preserving the sandbox and evidence. Investigate using correlation evidence, revoke delegated credentials, and re-enable only after the root cause and the relevant contract, policy, test, or ADR update have been reviewed.

## Service Objectives

Set an explicit execution timeout and resource budget per capability. Monitor denied actions, approval latency, sandbox exits, tool failures, invalid context, and policy evaluation failures. Alert on unexpected authority requests and repeated denials; they indicate a boundary mismatch rather than an invitation to weaken controls.

---
[Back to Agentic AI Profile](./README.md)
