# Agentic AI Resilience Guide

> **Bilingual Navigation:** [Version en Espanol](./resilience.es.md)

## Failure Semantics

Agentic AI fails closed. A timeout, cancellation, failed policy evaluation, missing provenance, invalid tool schema, unavailable approval, or sandbox violation denies the action. The caller receives a bounded result and can choose a human or deterministic fallback; the agent does not gain a broader capability.

## Resource Containment

Use ephemeral execution and enforce the duration, memory, and CPU bounds in `agent.config.json`. Queue or reject work when concurrency or dependency capacity is exhausted. Cancellation must stop downstream tool work where the tool supports it and record the final state in correlated evidence.

## Dependency Isolation

Tools are independently bounded dependencies. Apply per-tool timeout, retry only idempotent read operations under a finite budget, and circuit-break unhealthy tools. Never retry a mutative action unless the tool contract supplies an idempotency key and the approval remains valid for that exact action.

## Recovery

Recover by replaying only approved, evidence-backed deterministic steps. Reacquire context with provenance validation; do not replay raw prompts or unvalidated tool output as authority. A human fallback must use the same domain and audit boundary as the automated action.

## Resilience Verification

Negative fixtures must show blocking behavior for invalid resource bounds, policy, context, and audit controls. Exercise timeout, tool outage, approval outage, and cancellation in the adopter's integration tests before operational use.

---
[Back to Agentic AI Profile](./README.md)
