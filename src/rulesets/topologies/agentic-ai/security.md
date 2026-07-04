# Agentic AI Security Guide

> **Bilingual Navigation:** [Version en Espanol](./security.es.md)

## Trust Boundary

Treat prompts, retrieved documents, user input, and tool output as distinct inputs. Untrusted content is data only: it cannot select tools, alter capabilities, bypass approval, or modify the deterministic implementation. Provenance and schema validation are required before a tool result is used by the workflow.

## Execution Isolation

Every tool call runs through the isolated sandbox defined by `agent.config.json`. The sandbox MUST constrain network and process access, run ephemerally, and enforce duration, memory, and CPU limits. Direct repository, database, host-process, credential-store, or unrestricted network access is prohibited.

## Authorization and Secrets

An agent identity and a declared capability are prerequisites, not blanket authorization. Delegation must be scoped and expiring. Mutative tools require a recorded approval decision before execution. Secrets stay outside prompts and context; tools retrieve only the least privilege credential necessary for their action.

## Control Response

On a policy, provenance, schema, approval, or sandbox-control failure, deny the action, preserve correlated evidence, and return a bounded failure to the caller. Do not retry by broadening permissions or by substituting an unreviewed tool.

## Authority

Apply [ADR-0081](../../../reference/architecture/adrs/core/0081-agentic-ai-sandbox-isolation.md), [ADR-0082](../../../reference/architecture/adrs/core/0082-agentic-ai-trust-boundary.md), and [ADR-0083](../../../reference/architecture/adrs/core/0083-agentic-ai-action-authorization-audit.md) together. The executable controls are AAI-R01 through AAI-R07 in the [ruleset](./agentic-ai.rules.json) and [OPA policy](./agentic-ai.rego).

---
[Back to Agentic AI Profile](./README.md)
