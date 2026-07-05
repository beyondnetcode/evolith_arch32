# ADR-AI-005: Human-in-the-Loop policy for operations with irreversible impact

* **Status:** Proposed
* **Date:** 2026-05-11

## Context
Granting total autonomy to an agent to execute functions with side effects in the real world presents a catastrophic, unacceptable operational risk to the organization. Agents can hallucinate arguments, enter infinite loops, or be manipulated via indirect prompt injections.

## Decision
We define strict categories of operations that **ALWAYS** require the interruption of the agentic cycle and explicit, physical human approval. This is independent of trust level in the model or the test suite.

**Blocking Categories:**
1. Modifying or deleting data in production environments.
2. Sending external notifications/emails on behalf of the brand.
3. Financial operations (payments, refunds) over the corporate security threshold.
4. Critical changes in network security configurations or cloud IAM.

## Consequences
* **Extreme Risk Mitigation:** Prevents the "rogue agent" scenario deleting servers or expending unlimited cloud budget.
* **Legal Responsibility:** Guarantees a trace where a human is always the final signatory of the action, covering regulatory compliance.
* **Loss of Pure Autonomy:** Overnight or real-time agentic flows will suffer latency of hours waiting for human approval to proceed.

---
[Back to Index](./README.md)
